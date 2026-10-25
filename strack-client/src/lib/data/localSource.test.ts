import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/utils/axios', () => ({ default: {} }));

import { computeBalance, getDemoBalance, localSource as ds } from './localSource';
import { generateSeed } from './seed';
import { getErrorMessage } from '@/lib/features/user/thunkActions';

const store = new Map<string, string>();
beforeEach(async () => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  await ds.reset();
});

const all = async <T>(r: { list: (p?: { limit?: number }) => Promise<{ items: T[] }> }) =>
  (await r.list({ limit: 10000 })).items;
const rejects = (p: Promise<unknown>, msg: string) => expect(p.catch((e) => getErrorMessage(e))).resolves.toContain(msg);

describe('seed', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  it('is deterministic', () => {
    expect(generateSeed(now)).toEqual(generateSeed(now));
  });
  it('has the expected counts and a verified profile', () => {
    const d = generateSeed(now);
    expect(d.customers).toHaveLength(40);
    expect(d.paymentLinks).toHaveLength(8);
    expect(d.transactions).toHaveLength(250);
    expect(d.bankAccounts).toHaveLength(2);
    expect(d.payouts).toHaveLength(6);
    expect(d.user.verified).toBe(true);
    expect(d.user.complianceStatus).toBe('approved');
    expect(computeBalance(d.transactions)).toBeGreaterThan(0);
  });
  it('dates are within 90 days before now and never in the future', () => {
    const d = generateSeed(now);
    for (const t of d.transactions) {
      const age = (now.getTime() - new Date(t.date).getTime()) / 86400000;
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThanOrEqual(90);
    }
  });
  it('lazily seeds into strack:demo:* on first read', async () => {
    store.clear();
    expect((await ds.customers.list()).total).toBe(40);
    expect(store.has('strack:demo:customers')).toBe(true);
  });
});

describe('list filters and paging', () => {
  it('pages', async () => {
    const p2 = await ds.transactions.list({ page: 2, limit: 20 });
    expect(p2.items).toHaveLength(20);
    expect(p2.total).toBe(250);
    expect(p2.page).toBe(2);
  });
  it('filters by status, type, search and date range', async () => {
    const txns = await all(ds.transactions);
    const ok = await ds.transactions.list({ status: 'successful', limit: 1000 });
    expect(ok.total).toBe(txns.filter((t) => t.status === 'successful').length);
    expect((await ds.transactions.list({ type: 'debit', limit: 1000 })).total).toBe(6);
    const c = (await ds.customers.list()).items[0];
    expect((await ds.customers.list({ search: c.email.toUpperCase() })).items.map((x) => x.id)).toContain(c.id);
    const from = txns[100].date;
    const to = txns[50].date;
    const r = await ds.transactions.list({ from, to, limit: 1000 });
    expect(r.total).toBe(txns.filter((t) => t.date >= from && t.date <= to).length);
    expect(r.items.every((t) => t.date >= from && t.date <= to)).toBe(true);
  });
  it('sorts newest first by default and honours sort/direction', async () => {
    const items = (await ds.transactions.list({ limit: 250 })).items;
    expect(items[0].date >= items[1].date).toBe(true);
    const asc = (await ds.transactions.list({ sort: 'amount', direction: 'asc', limit: 250 })).items;
    expect(asc[0].amount).toBeLessThanOrEqual(asc[249].amount);
  });
});

describe('CRUD and activity', () => {
  it('customer create/get/update/remove each write activity', async () => {
    const before = (await ds.activity.list({ limit: 1000 })).total;
    const c = await ds.customers.create({ name: 'Zed Test', email: 'z@t.com' });
    expect((await ds.customers.get(c.id)).name).toBe('Zed Test');
    await ds.customers.update(c.id, { name: 'Zed Two' });
    await ds.customers.remove(c.id);
    await expect(ds.customers.get(c.id)).rejects.toThrow('not found');
    const events = await all(ds.activity);
    expect(events.length).toBe(before + 3);
    expect(events.filter((e) => e.entityId === c.id).map((e) => e.action).sort()).toEqual(['create', 'delete', 'update']);
  });
  it('deleting a customer detaches their transactions', async () => {
    const t = (await all(ds.transactions)).find((x) => x.customerId)!;
    await ds.customers.remove(t.customerId!);
    expect((await ds.transactions.get(t.id)).customerId).toBeUndefined();
  });
  it('payment links create with slug and activity', async () => {
    const l = await ds.paymentLinks.create({ title: 'My Link!', status: 'active', amount: 1000 });
    expect(l.slug).toMatch(/^my-link-/);
    await ds.paymentLinks.update(l.id, { status: 'disabled' });
    await rejects(ds.paymentLinks.simulatePayment(l.id), 'disabled');
  });
  it('bank accounts keep a single default', async () => {
    const b = await ds.bankAccounts.create({ bankName: 'Zenith Bank', accountNumber: '1111111111', accountName: 'X', isDefault: true });
    const accts = await all(ds.bankAccounts);
    expect(accts.filter((a) => a.isDefault).map((a) => a.id)).toEqual([b.id]);
    await ds.bankAccounts.remove(b.id);
    expect((await all(ds.bankAccounts)).filter((a) => a.isDefault)).toHaveLength(1);
  });
  it('support tickets', async () => {
    const t = await ds.support.create({ subject: 's', category: 'c', message: 'm' });
    expect((await ds.support.reply(t.id, 'hi')).replies).toHaveLength(1);
    expect((await ds.support.close(t.id)).status).toBe('closed');
  });
  it('settings update persists', async () => {
    await ds.settings.update({ theme: 'dark' });
    expect((await ds.settings.get()).theme).toBe('dark');
  });
});

describe('money flows', () => {
  it('balance is computed from successful credits minus debits', () => {
    const base = { reference: 'r', date: 'd' };
    expect(
      computeBalance([
        { id: '1', type: 'credit', amount: 1000, status: 'successful', ...base },
        { id: '2', type: 'credit', amount: 500, status: 'pending', ...base },
        { id: '3', type: 'debit', amount: 300, status: 'successful', ...base },
        { id: '4', type: 'debit', amount: 100, status: 'failed', ...base },
      ])
    ).toBe(700);
  });
  it('simulatePayment credits the balance and links the chosen customer', async () => {
    const link = (await all(ds.paymentLinks)).find((l) => l.status === 'active' && l.amount)!;
    const cus = (await all(ds.customers))[0];
    const [bal, n] = [getDemoBalance(), (await ds.customers.list()).total];
    const t = await ds.paymentLinks.simulatePayment(link.id, { customerId: cus.id });
    expect(t).toMatchObject({ type: 'credit', status: 'successful', amount: link.amount, paymentLinkId: link.id, customerId: cus.id, channel: 'payment_link' });
    expect(getDemoBalance()).toBe(bal + link.amount!);
    expect((await ds.customers.list()).total).toBe(n);
    expect((await ds.transactions.list({ paymentLinkId: link.id, customerId: cus.id, limit: 10000 })).items.map((x) => x.id)).toContain(t.id);
  });
  it('payout creates a debit and reduces the balance', async () => {
    const bal = getDemoBalance();
    const p = await ds.payouts.create({ amount: 100000, bankAccountId: 'bnk_001' });
    const debit = (await all(ds.transactions)).find((t) => t.payoutId === p.id)!;
    expect(debit).toMatchObject({ type: 'debit', amount: 100000 + p.fee, status: 'successful' });
    expect(getDemoBalance()).toBe(bal - 100000 - p.fee);
    expect((await all(ds.payouts))).toHaveLength(7);
  });
  it('payout over the balance is rejected and changes nothing', async () => {
    const bal = getDemoBalance();
    await rejects(ds.payouts.create({ amount: bal, bankAccountId: 'bnk_001' }), 'Insufficient balance'); // fee pushes it over
    await rejects(ds.payouts.create({ amount: bal + 1, bankAccountId: 'bnk_001' }), 'Insufficient balance');
    expect(getDemoBalance()).toBe(bal);
    expect(await all(ds.payouts)).toHaveLength(6);
    await rejects(ds.payouts.create({ amount: 0, bankAccountId: 'bnk_001' }), 'Minimum payout');
  });
  it('payout of exactly balance minus fee is allowed', async () => {
    await ds.payouts.create({ amount: getDemoBalance() - 5000, bankAccountId: 'bnk_001' });
    expect(getDemoBalance()).toBe(0);
  });
  it('refund creates a linked debit once', async () => {
    const orig = (await all(ds.transactions)).find((t) => t.type === 'credit' && t.status === 'successful')!;
    const bal = getDemoBalance();
    const r = await ds.transactions.refund(orig.id);
    expect(r).toMatchObject({ type: 'debit', amount: orig.amount, refundOf: orig.id, status: 'successful' });
    expect(getDemoBalance()).toBe(bal - orig.amount);
    await rejects(ds.transactions.refund(orig.id), 'already been refunded');
  });
  it('refund rejects non-successful or debit transactions', async () => {
    const txns = await all(ds.transactions);
    await rejects(ds.transactions.refund(txns.find((t) => t.status === 'pending')!.id), 'Only successful');
    await rejects(ds.transactions.refund(txns.find((t) => t.type === 'debit')!.id), 'Only successful');
  });
  it('updateStatus and addNote persist and log activity', async () => {
    const t = (await all(ds.transactions)).find((x) => x.status === 'pending')!;
    const n = (await ds.activity.list({ limit: 1000 })).total;
    expect((await ds.transactions.updateStatus(t.id, 'successful')).status).toBe('successful');
    expect((await ds.transactions.addNote(t.id, 'checked')).note).toBe('checked');
    expect((await ds.transactions.get(t.id)).note).toBe('checked');
    expect((await ds.activity.list({ limit: 1000 })).total).toBe(n + 2);
  });
});

describe('reset', () => {
  it('re-seeds and discards changes', async () => {
    await ds.customers.create({ name: 'Temp', email: 't@t.com' });
    await ds.reset();
    expect((await ds.customers.list()).total).toBe(40);
    expect((await ds.activity.list({ search: 'Temp' })).total).toBe(0);
  });
});

describe('compliance in demo', () => {
  const file = (n: string) => ({ name: n, type: 'application/pdf', size: 10 }) as File;
  it('seeded user is verified', async () => {
    expect((await ds.user.get()).verified).toBe(true);
    await rejects(ds.user.update({ firstName: 'X' }), 'no longer be edited');
  });
  it('runs the flow end to end on a fresh profile', async () => {
    const raw = JSON.parse(store.get('strack:demo:user')!);
    store.set('strack:demo:user', JSON.stringify({ _id: raw._id, firstName: '', lastName: '', email: '', phone: '', accountType: 'business', complianceStatus: 'not_started', verified: false }));
    await rejects(ds.user.submitCompliance(), 'Complete these steps first');
    let u = await ds.user.update({ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '1', dob: '1990-01-01', bvn: '123' });
    expect(u.complianceStatus).toBe('in_progress');
    expect(u.complianceProgress).toEqual({ personalInformation: true, businessDetails: false, businessDocuments: false });
    u = await ds.user.update({ businessName: 'N', businessEmail: 'n@b.com', rcNumber: '1', businessType: 't', industry: 'i', businessAddress: 'a' });
    u = await ds.user.uploadDocuments({ cac: file('c.pdf'), memorandum: file('m.pdf'), utility: file('u.pdf'), validId: file('v.pdf') });
    expect(u.documents?.cac?.filename).toBe('c.pdf');
    expect(u.complianceProgress?.businessDocuments).toBe(true);
    u = await ds.user.submitCompliance();
    expect(u).toMatchObject({ verified: true, complianceStatus: 'approved' });
    expect((await ds.user.get()).verified).toBe(true);
    await rejects(ds.user.uploadDocuments({}), 'no longer be edited');
  });
});

describe('review fixes', () => {
  it('updateStatus rejects payout and refund transactions', async () => {
    const txns = await all(ds.transactions);
    await rejects(ds.transactions.updateStatus(txns.find((t) => t.payoutId)!.id, 'failed'), 'cannot be changed');
    const orig = txns.find((t) => t.type === 'credit' && t.status === 'successful')!;
    const r = await ds.transactions.refund(orig.id);
    await rejects(ds.transactions.updateStatus(r.id, 'failed'), 'cannot be changed');
  });
  it('updateStatus keeps a refunded credit successful', async () => {
    const orig = (await all(ds.transactions)).find((t) => t.type === 'credit' && t.status === 'successful')!;
    await ds.transactions.refund(orig.id);
    await rejects(ds.transactions.updateStatus(orig.id, 'failed'), 'must stay successful');
  });
  it('updateStatus cannot make the balance negative', async () => {
    await ds.payouts.create({ amount: getDemoBalance() - 5000, bankAccountId: 'bnk_001' }); // balance 0
    const credit = (await all(ds.transactions)).find((t) => t.type === 'credit' && t.status === 'successful' && !t.paymentLinkId === false)!;
    await rejects(ds.transactions.updateStatus(credit.id, 'failed'), 'negative');
    expect((await ds.transactions.get(credit.id)).status).toBe('successful');
  });
  it('updateStatus allows lowering a balance that stays positive', async () => {
    const txns = await all<{ id: string; type: string; status: string; amount: number; refundOf?: string; payoutId?: string }>(ds.transactions);
    const credit = txns.find((t) => t.type === 'credit' && t.status === 'successful' && !txns.some((x) => x.refundOf === t.id))!;
    const before = getDemoBalance();
    expect(before).toBeGreaterThan(credit.amount);
    await ds.transactions.updateStatus(credit.id, 'failed');
    expect(getDemoBalance()).toBe(before - credit.amount);
  });
  it('updateStatus allows a change that raises an already negative balance', async () => {
    const txns = JSON.parse(store.get('strack:demo:transactions')!);
    const debit = { ...txns[0], id: 'txn_neg', type: 'debit', status: 'successful', amount: getDemoBalance() + 100_000 };
    delete debit.payoutId;
    delete debit.refundOf;
    const small = { ...debit, id: 'txn_small', amount: 1_000 };
    store.set('strack:demo:transactions', JSON.stringify([...txns, debit, small]));
    const before = getDemoBalance();
    expect(before).toBeLessThan(0);
    // Failing the small debit raises the balance but it stays negative: allowed.
    await ds.transactions.updateStatus('txn_small', 'failed');
    expect(getDemoBalance()).toBe(before + 1_000);
    // Failing a credit would lower it further: still blocked.
    const credit = txns.find((t: { type: string; status: string; id: string }) =>
      t.type === 'credit' && t.status === 'successful' && !txns.some((x: { refundOf?: string }) => x.refundOf === t.id));
    await rejects(ds.transactions.updateStatus(credit.id, 'failed'), 'negative');
  });

  const fakeIdb = (mode: 'ok' | 'abort' | 'blocked', delay = 0) => {
    const closed = vi.fn();
    const idb = {
      open: () => {
        const req: { onsuccess?: () => void; onblocked?: () => void; result: unknown } = { result: { createObjectStore: () => {}, close: closed, transaction: () => {
          const tx: { onabort?: () => void; oncomplete?: () => void; objectStore: () => unknown } = { objectStore: () => ({ put: () => {} }) };
          setTimeout(() => (mode === 'abort' ? tx.onabort?.() : tx.oncomplete?.()), delay);
          return tx;
        } } };
        setTimeout(() => {
          if (mode === 'blocked') req.onblocked?.();
          else req.onsuccess?.();
        }, 0);
        return req;
      },
    };
    vi.stubGlobal('indexedDB', idb);
    return closed;
  };
  const file = { name: 'c.pdf', type: 'application/pdf', size: 10 } as File;
  const fresh = () => {
    const raw = JSON.parse(store.get('strack:demo:user')!);
    store.set('strack:demo:user', JSON.stringify({ _id: raw._id, firstName: '', lastName: '', email: '', phone: '', accountType: 'business', complianceStatus: 'not_started' }));
  };
  it.each(['abort', 'blocked'] as const)('upload falls back to metadata when IndexedDB %s', async (mode) => {
    fresh();
    const closed = fakeIdb(mode);
    const u = await ds.user.uploadDocuments({ cac: file });
    expect(u.documents?.cac?.filename).toBe('c.pdf');
    if (mode === 'abort') expect(closed).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('upload does not lose an edit made while files are being stored', async () => {
    fresh();
    fakeIdb('ok', 20);
    const up = ds.user.uploadDocuments({ cac: file });
    await ds.user.update({ firstName: 'Edited' });
    const u = await up;
    expect(u.firstName).toBe('Edited');
    expect(u.documents?.cac).toBeDefined();
    vi.unstubAllGlobals();
  });

  it('date-only filters use the local day', async () => {
    const orig = process.env.TZ;
    process.env.TZ = 'Pacific/Auckland';
    try {
      const local = (h: number, m = 0) => new Date(2026, 5, 10, h, m, 0, 0).toISOString();
      const base = JSON.parse(store.get('strack:demo:transactions')!)[0];
      const mk = (id: string, date: string) => ({ ...base, id, date });
      store.set('strack:demo:transactions', JSON.stringify([mk('early', local(0, 30)), mk('late', local(23, 30)), mk('prev', new Date(2026, 5, 9, 23, 30).toISOString()), mk('next', new Date(2026, 5, 11, 0, 30).toISOString())]));
      const r = await ds.transactions.list({ from: '2026-06-10', to: '2026-06-10', limit: 50 });
      expect(r.items.map((t) => t.id).sort()).toEqual(['early', 'late']);
    } finally {
      process.env.TZ = orig;
      if (orig === undefined) delete process.env.TZ;
    }
  });
});

describe('stats.overview (local source)', () => {
  it('uses stored data and the computed balance', async () => {
    const o = await ds.stats.overview({ from: '2000-01-01', to: '2100-01-01', interval: 'month' });
    expect(o.balance).toBe(getDemoBalance());
    expect(o.customerCount).toBe(40);
    expect(o.transactionCount).toBe(250);
    expect(o.topCustomers).toHaveLength(5);
  });

  describe('customers (server semantics)', () => {
    it('trims, lowercases email and validates', async () => {
      const c = await ds.customers.create({ name: '  Ada  ', email: ' ADA@Example.COM ' });
      expect([c.name, c.email]).toEqual(['Ada', 'ada@example.com']);
      await rejects(ds.customers.create({ name: ' ', email: 'x@y.com' }), 'Name is required');
      await rejects(ds.customers.create({ name: 'X', email: 'nope' }), 'Invalid email');
    });
    it('treats null optional fields as empty, not the text "null"', async () => {
      const c = await ds.customers.create({ name: 'N', email: 'n@t.com', phone: null, notes: null } as never);
      expect([c.phone, c.notes]).toEqual(['', '']);
    });
    it('rejects a duplicate email (case-insensitive) with 409, on create and update', async () => {
      await ds.customers.create({ name: 'A', email: 'dup@t.com' });
      const err = await ds.customers.create({ name: 'B', email: 'DUP@t.com' }).catch((e) => e);
      expect(err.response.status).toBe(409);
      const b = await ds.customers.create({ name: 'B', email: 'b@t.com' });
      const err2 = await ds.customers.update(b.id, { email: 'dup@t.com' }).catch((e) => e);
      expect(err2.response.status).toBe(409);
      // Keeping your own email is fine.
      await expect(ds.customers.update(b.id, { email: 'B@t.com', name: 'B2' })).resolves.toMatchObject({ name: 'B2' });
    });
    it('returns 404 for a missing customer on get/update/remove', async () => {
      for (const p of [ds.customers.get('nope'), ds.customers.update('nope', { name: 'x' }), ds.customers.remove('nope')]) {
        expect(((await p.catch((e) => e)) as { response: { status: number } }).response.status).toBe(404);
      }
    });
    it('search matches name, email and phone but not notes', async () => {
      const c = await ds.customers.create({ name: 'Zyx Person', email: 'zp@t.com', phone: '08099990000', notes: 'qqnoteqq' });
      const ids = async (search: string) => (await ds.customers.list({ search })).items.map((x) => x.id);
      expect(await ids('zyx per')).toContain(c.id);
      expect(await ids('ZP@T')).toContain(c.id);
      expect(await ids('0809999')).toContain(c.id);
      expect(await ids('qqnoteqq')).toEqual([]);
    });
    it('filters transactions by customerId', async () => {
      const t = (await all(ds.transactions)).find((x) => x.customerId)!;
      const r = await ds.transactions.list({ customerId: t.customerId, limit: 10000 });
      expect(r.items.length).toBeGreaterThan(0);
      expect(r.items.every((x) => x.customerId === t.customerId)).toBe(true);
    });
  });
});

describe('payment links (server semantics)', () => {
  const status = async (p: Promise<unknown>) => p.then(() => 0, (e) => e.response.status as number);
  const mk = (o: object = {}) => ds.paymentLinks.create({ title: 'Fee', status: 'active', ...o });

  it('validates title, amount, description and unknown keys', async () => {
    await rejects(mk({ title: '  ' }), 'Title is required');
    await rejects(mk({ title: 'x'.repeat(101) }), 'at most 100');
    await rejects(mk({ amount: 0 }), 'valid amount');
    await rejects(mk({ amount: 10.5 }), 'valid amount');
    await rejects(mk({ amount: 1e12 }), 'too large');
    await rejects(mk({ description: 'x'.repeat(501) }), 'at most 500');
    await rejects(mk({ slug: 'mine' }), 'Unrecognized');
    await rejects(ds.paymentLinks.update((await mk()).id, { slug: 'x' } as never), 'Unrecognized');
  });
  it('generates unique slugs and trims the title; amount can be cleared', async () => {
    const a = await mk({ title: ' Same ', amount: 500 });
    const b = await mk({ title: 'Same' });
    expect(a.title).toBe('Same');
    expect(a.slug).not.toBe(b.slug);
    expect(a.slug).toMatch(/^same-[0-9a-f]{8}$/);
    const u = await ds.paymentLinks.update(a.id, { amount: null as never });
    expect(u.amount).toBeUndefined();
    expect((await ds.paymentLinks.update(a.id, { title: 'New' })).slug).toBe(a.slug);
  });
  it('list filters by status and searches title/description only', async () => {
    const l = await mk({ title: 'Zebra Fee', description: 'stripes', status: 'disabled' });
    expect((await ds.paymentLinks.list({ search: 'stripes' })).items.map((x) => x.id)).toEqual([l.id]);
    expect((await ds.paymentLinks.list({ search: l.slug })).total).toBe(0);
    const d = await ds.paymentLinks.list({ status: 'disabled', limit: 1000 });
    expect(d.items.every((x) => x.status === 'disabled')).toBe(true);
    expect(d.items.map((x) => x.id)).toContain(l.id);
  });
  it('deleting a link detaches its transactions', async () => {
    const l = await mk({ amount: 700 });
    const t = await ds.paymentLinks.simulatePayment(l.id);
    await ds.paymentLinks.remove(l.id);
    expect((await ds.transactions.get(t.id)).paymentLinkId).toBeUndefined();
  });
  it('simulatePayment: disabled is 409, unknown link 404', async () => {
    const l = await mk({ amount: 700, status: 'disabled' });
    expect(await status(ds.paymentLinks.simulatePayment(l.id))).toBe(409);
    expect(await status(ds.paymentLinks.simulatePayment('nope'))).toBe(404);
  });
  it('simulatePayment: fixed link forbids a different amount, accepts the same or none', async () => {
    const l = await mk({ amount: 700 });
    expect(await status(ds.paymentLinks.simulatePayment(l.id, { amount: 701 }))).toBe(400);
    expect((await ds.paymentLinks.simulatePayment(l.id, { amount: 700 })).amount).toBe(700);
    expect((await ds.paymentLinks.simulatePayment(l.id)).amount).toBe(700);
  });
  it('simulatePayment: open link requires a valid amount', async () => {
    const l = await mk();
    expect(await status(ds.paymentLinks.simulatePayment(l.id))).toBe(400);
    expect(await status(ds.paymentLinks.simulatePayment(l.id, { amount: 0 }))).toBe(400);
    expect(await status(ds.paymentLinks.simulatePayment(l.id, { amount: 1.5 }))).toBe(400);
    const bal = getDemoBalance();
    expect((await ds.paymentLinks.simulatePayment(l.id, { amount: 1234 })).amount).toBe(1234);
    expect(getDemoBalance()).toBe(bal + 1234);
  });
  it('simulatePayment: unknown customer is 404 and nothing is recorded', async () => {
    const l = await mk({ amount: 700 });
    const n = (await ds.transactions.list()).total;
    expect(await status(ds.paymentLinks.simulatePayment(l.id, { customerId: 'cus_missing' }))).toBe(404);
    expect((await ds.transactions.list()).total).toBe(n);
  });
});

describe('transactions page behaviour', () => {
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const day = (iso: string, delta = 0) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + delta);
    return ymd(d);
  };
  const L = { limit: 1000 };

  it('from/to are inclusive local days', async () => {
    const t = (await all(ds.transactions))[100];
    const d = day(t.date);
    const same = await ds.transactions.list({ from: d, to: d, ...L });
    expect(same.items.map((x) => x.id)).toContain(t.id);
    expect(same.items.every((x) => ymd(new Date(x.date)) === d)).toBe(true);
    const before = await ds.transactions.list({ to: day(t.date, -1), ...L });
    const after = await ds.transactions.list({ from: day(t.date, 1), ...L });
    expect(before.items.map((x) => x.id)).not.toContain(t.id);
    expect(after.items.map((x) => x.id)).not.toContain(t.id);
    expect(before.total + same.total + after.total).toBe(250);
  });

  it('combines status, type, customer and link filters', async () => {
    const txns = await all(ds.transactions);
    const t = txns.find((x) => x.customerId && x.paymentLinkId)!;
    const r = await ds.transactions.list({
      customerId: t.customerId, paymentLinkId: t.paymentLinkId, status: t.status, type: t.type, ...L,
    });
    expect(r.items.map((x) => x.id)).toContain(t.id);
    expect(r.items.every((x) => x.customerId === t.customerId && x.paymentLinkId === t.paymentLinkId && x.status === t.status && x.type === t.type)).toBe(true);
  });

  it('sorts by date descending by default', async () => {
    const items = (await ds.transactions.list(L)).items;
    expect(items.map((x) => x.date)).toEqual([...items.map((x) => x.date)].sort().reverse());
  });

  it('search matches reference and description only (case-insensitive)', async () => {
    const t = (await all(ds.transactions))[3];
    await ds.transactions.addNote(t.id, 'zzuniquenote');
    expect((await ds.transactions.list({ search: t.reference.toLowerCase(), ...L })).items.map((x) => x.id)).toContain(t.id);
    expect((await ds.transactions.list({ search: 'zzuniquenote', ...L })).total).toBe(0);
    expect((await ds.transactions.list({ search: t.id, ...L })).total).toBe(0);
    if (t.description) expect((await ds.transactions.list({ search: t.description.toUpperCase(), ...L })).items.map((x) => x.id)).toContain(t.id);
  });

  it('note: max 500 characters, trimmed, empty clears', async () => {
    const t = (await all(ds.transactions))[0];
    expect((await ds.transactions.addNote(t.id, 'x'.repeat(500))).note).toHaveLength(500);
    await rejects(ds.transactions.addNote(t.id, 'x'.repeat(501)), 'at most 500');
    expect((await ds.transactions.addNote(t.id, '  hi  ')).note).toBe('hi');
    expect((await ds.transactions.addNote(t.id, '   ')).note).toBeUndefined();
  });

  it('refund creates a linked successful debit and blocks a second refund and un-succeeding the original', async () => {
    const orig = (await all(ds.transactions)).find((t) => t.type === 'credit' && t.status === 'successful')!;
    const before = getDemoBalance();
    const r = await ds.transactions.refund(orig.id);
    expect(r).toMatchObject({ type: 'debit', status: 'successful', amount: orig.amount, refundOf: orig.id });
    expect(getDemoBalance()).toBe(before - orig.amount);
    await rejects(ds.transactions.refund(orig.id), 'already been refunded');
    await rejects(ds.transactions.updateStatus(orig.id, 'failed'), 'must stay successful');
    await rejects(ds.transactions.refund(r.id), 'Only successful');
  });

  it('refund rejects when the balance is too low', async () => {
    const orig = (await all(ds.transactions)).find((t) => t.type === 'credit' && t.status === 'successful')!;
    const bal = getDemoBalance();
    // Leave the balance (after the 1-unit remainder and the payout fee) below the refund amount.
    const fee = (await ds.payouts.list({ limit: 1 })).items[0].fee;
    await ds.payouts.create({ amount: bal - fee - 1, bankAccountId: 'bnk_001' });
    expect(getDemoBalance()).toBe(1);
    await rejects(ds.transactions.refund(orig.id), 'Insufficient balance');
  });
});

describe('bank accounts and payouts rules', () => {
  const acct = { bankName: 'Zenith Bank', accountNumber: '1111111111', accountName: 'Ada' };
  const defaults = async () => (await all(ds.bankAccounts)).filter((a) => a.isDefault);

  it('validates account number, bank and name', async () => {
    for (const n of ['123456789', '12345678901', '12345abcde', '']) {
      await rejects(ds.bankAccounts.create({ ...acct, accountNumber: n, isDefault: false }), '10 digits');
    }
    await rejects(ds.bankAccounts.create({ ...acct, bankName: 'Fake Bank', isDefault: false }), 'supported bank');
    await rejects(ds.bankAccounts.create({ ...acct, accountName: '  ', isDefault: false }), 'Account name is required');
    await rejects(ds.bankAccounts.create({ ...acct, accountName: 'x'.repeat(101), isDefault: false }), 'at most 100');
    await rejects(ds.bankAccounts.update('bnk_001', { accountNumber: '12' }), '10 digits');
    expect(await all(ds.bankAccounts)).toHaveLength(2);
  });
  it('rejects a duplicate {accountNumber, bankName} but allows the same number at another bank', async () => {
    await ds.bankAccounts.create({ ...acct, isDefault: false });
    await rejects(ds.bankAccounts.create({ ...acct, isDefault: false }), 'already exists');
    await ds.bankAccounts.create({ ...acct, bankName: 'Access Bank', isDefault: false });
    const other = await ds.bankAccounts.create({ ...acct, bankName: 'Wema Bank', isDefault: false });
    await rejects(ds.bankAccounts.update(other.id, { bankName: 'Zenith Bank' }), 'already exists');
  });
  it('keeps exactly one default and promotes another when it is deleted', async () => {
    const b = await ds.bankAccounts.create({ ...acct, isDefault: true });
    expect((await defaults()).map((a) => a.id)).toEqual([b.id]);
    await ds.bankAccounts.update('bnk_002', { isDefault: true });
    expect((await defaults()).map((a) => a.id)).toEqual(['bnk_002']);
    await ds.bankAccounts.update('bnk_002', { isDefault: false }); // cannot be unset directly
    expect((await defaults()).map((a) => a.id)).toEqual(['bnk_002']);
    await ds.bankAccounts.update(b.id, { isDefault: true });
    await ds.bankAccounts.remove(b.id); // the default, no payouts
    expect((await defaults())).toHaveLength(1);
    expect(await all(ds.bankAccounts)).toHaveLength(2);
  });
  it('the first account becomes the default', async () => {
    store.set('strack:demo:payouts', '[]');
    for (const a of await all(ds.bankAccounts)) await ds.bankAccounts.remove(a.id);
    expect(await all(ds.bankAccounts)).toHaveLength(0);
    const first = await ds.bankAccounts.create({ ...acct, isDefault: false });
    expect(first.isDefault).toBe(true);
    const second = await ds.bankAccounts.create({ ...acct, bankName: 'Access Bank', isDefault: false });
    expect(second.isDefault).toBe(false);
  });
  it('rejects deleting an account that has payouts (409) and keeps it', async () => {
    const e = await ds.bankAccounts.remove('bnk_001').catch((x) => x);
    expect(e.response.status).toBe(409);
    expect(getErrorMessage(e)).toContain('has payouts');
    expect(await all(ds.bankAccounts)).toHaveLength(2);
    const fresh = await ds.bankAccounts.create({ ...acct, isDefault: false });
    await ds.bankAccounts.remove(fresh.id);
    expect(await all(ds.bankAccounts)).toHaveLength(2);
  });
  it('payout enforces min and max and rejects non-integers', async () => {
    await rejects(ds.payouts.create({ amount: 9999, bankAccountId: 'bnk_001' }), 'Minimum payout');
    await rejects(ds.payouts.create({ amount: 1_000_000_001, bankAccountId: 'bnk_001' }), 'Maximum payout');
    await rejects(ds.payouts.create({ amount: 10000.5, bankAccountId: 'bnk_001' }), 'valid amount');
    const before = getDemoBalance();
    const p = await ds.payouts.create({ amount: 10000, bankAccountId: 'bnk_001' });
    expect(p).toMatchObject({ amount: 10000, fee: 5000, status: 'successful' });
    expect(getDemoBalance()).toBe(before - 15000);
  });
  it('payout needs an existing bank account', async () => {
    const e = await ds.payouts.create({ amount: 10000, bankAccountId: 'nope' }).catch((x) => x);
    expect(e.response.status).toBe(404);
    expect(await all(ds.payouts)).toHaveLength(6);
  });
  it('a payout cannot spend the balance twice', async () => {
    const amount = getDemoBalance() - 5000;
    await ds.payouts.create({ amount, bankAccountId: 'bnk_001' });
    await rejects(ds.payouts.create({ amount: 10000, bankAccountId: 'bnk_001' }), 'Insufficient balance');
  });
  it('freezes bank details once an account has payouts (409) but allows the name', async () => {
    for (const patch of [{ bankName: 'Access Bank' }, { accountNumber: '9999999999' }]) {
      const e = await ds.bankAccounts.update('bnk_001', patch).catch((x) => x);
      expect(e.response.status).toBe(409);
      expect(getErrorMessage(e)).toContain('add a new account instead');
    }
    await ds.bankAccounts.update('bnk_001', { accountName: 'New Name' });
    const fresh = await ds.bankAccounts.create({ ...acct, isDefault: false });
    expect((await ds.bankAccounts.update(fresh.id, { accountNumber: '2222222222' })).accountNumber).toBe('2222222222');
  });
  it('snapshots bank details on the payout', async () => {
    const fresh = await ds.bankAccounts.create({ ...acct, isDefault: false });
    const p = await ds.payouts.create({ amount: 10000, bankAccountId: fresh.id });
    expect(p).toMatchObject({ bankName: 'Zenith Bank', accountNumber: '1111111111' });
    expect((await ds.payouts.get(p.id)).bankName).toBe('Zenith Bank');
  });
  it('a repeated idempotency key returns the first payout and debits once', async () => {
    const before = getDemoBalance();
    const a = await ds.payouts.create({ amount: 10000, bankAccountId: 'bnk_001', idempotencyKey: 'key-12345678' });
    const b = await ds.payouts.create({ amount: 10000, bankAccountId: 'bnk_001', idempotencyKey: 'key-12345678' });
    expect(b.id).toBe(a.id);
    expect(await all(ds.payouts)).toHaveLength(7);
    expect(getDemoBalance()).toBe(before - 15000);
    const e = await ds.payouts.create({ amount: 20000, bankAccountId: 'bnk_001', idempotencyKey: 'key-12345678' }).catch((x) => x);
    expect(e.response.status).toBe(409);
    await ds.payouts.create({ amount: 10000, bankAccountId: 'bnk_001', idempotencyKey: 'other-key-1' });
    expect(await all(ds.payouts)).toHaveLength(8);
  });
  it('refund failures are 409', async () => {
    const txns = await all<{ id: string; type: string; status: string }>(ds.transactions);
    const orig = txns.find((t) => t.type === 'credit' && t.status === 'successful')!;
    await ds.transactions.refund(orig.id);
    for (const id of [orig.id, txns.find((t) => t.type === 'debit')!.id]) {
      const e = await ds.transactions.refund(id).catch((x) => x);
      expect(e.response.status).toBe(409);
    }
  });
  it('bank accounts have createdAt and list newest first', async () => {
    const fresh = await ds.bankAccounts.create({ ...acct, isDefault: false });
    const list = await all(ds.bankAccounts);
    expect(fresh.createdAt).toBeTruthy();
    expect(list[0].id).toBe(fresh.id);
    expect(list.every((a) => !!a.createdAt)).toBe(true);
  });
});
