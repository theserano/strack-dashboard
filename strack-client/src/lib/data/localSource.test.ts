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
    const b = await ds.bankAccounts.create({ bankName: 'Zenith', accountNumber: '111', accountName: 'X', isDefault: true });
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
  it('simulatePayment credits the balance and creates a new customer', async () => {
    const link = (await all(ds.paymentLinks)).find((l) => l.status === 'active' && l.amount)!;
    const [bal, n] = [getDemoBalance(), (await ds.customers.list()).total];
    const t = await ds.paymentLinks.simulatePayment(link.id);
    expect(t).toMatchObject({ type: 'credit', status: 'successful', amount: link.amount, paymentLinkId: link.id });
    expect(getDemoBalance()).toBe(bal + link.amount!);
    expect((await ds.customers.list()).total).toBe(n + 1);
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
    await rejects(ds.payouts.create({ amount: 0, bankAccountId: 'bnk_001' }), 'valid amount');
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
