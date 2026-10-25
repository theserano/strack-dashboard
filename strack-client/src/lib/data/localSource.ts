import type { DocumentType, StoredDocument, User } from '@/lib/features/user/thunkActions';
import { DEMO_USER_ID, PAYOUT_FEE, generateSeed, type DemoData } from './seed';
import { computeOverview } from './overview';
import type {
  ActivityEvent,
  BankAccount,
  Customer,
  DataSource,
  Id,
  ListParams,
  ListResult,
  PaymentLink,
  Payout,
  Settings,
  SupportTicket,
  Transaction,
  TransactionStatus,
} from './types';

/* ------------------------------------------
   STORAGE (localStorage under strack:demo:*, in-memory fallback)
------------------------------------------- */

const PREFIX = 'strack:demo:';
const SEEDED_KEY = `${PREFIX}seeded`;
const SEED_VERSION = '1';
const DATA_KEYS = ['customers', 'paymentLinks', 'transactions', 'bankAccounts', 'payouts', 'activity', 'support', 'user', 'settings'] as const;

const memory = new Map<string, string>();
// Set when localStorage is missing, blocked or full: from then on the memory copy is the truth.
let memoryOnly = false;

const readRaw = (key: string): string | null => {
  if (!memoryOnly) {
    try {
      if (globalThis.localStorage) return globalThis.localStorage.getItem(key);
    } catch {
      // Blocked storage: fall through to memory.
    }
    memoryOnly = true;
  }
  return memory.get(key) ?? null;
};

const writeRaw = (key: string, value: string) => {
  memory.set(key, value);
  if (memoryOnly) return;
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // Quota or blocked storage: keep going from memory.
    memoryOnly = true;
  }
};

const removeRaw = (key: string) => {
  memory.delete(key);
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Ignore.
  }
};

const writeAll = (data: DemoData) => {
  for (const k of DATA_KEYS) writeRaw(PREFIX + k, JSON.stringify(data[k]));
  writeRaw(SEEDED_KEY, SEED_VERSION);
};

/** Seeds lazily on the first read. */
const ensureSeeded = () => {
  if (readRaw(SEEDED_KEY) !== SEED_VERSION) writeAll(generateSeed());
};

const load = <K extends (typeof DATA_KEYS)[number]>(key: K): DemoData[K] => {
  ensureSeeded();
  try {
    return JSON.parse(readRaw(PREFIX + key) ?? 'null') as DemoData[K];
  } catch {
    // Corrupt data: start over from a fresh seed.
    writeAll(generateSeed());
    return JSON.parse(readRaw(PREFIX + key) as string) as DemoData[K];
  }
};

const save = <K extends (typeof DATA_KEYS)[number]>(key: K, value: DemoData[K]) => {
  writeRaw(PREFIX + key, JSON.stringify(value));
};

/* ------------------------------------------
   HELPERS
------------------------------------------- */

/** Same shape as an axios error so getErrorMessage() works unchanged. */
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { response: { status, data: { message } } });
};

const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const newRef = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
const nowIso = () => new Date().toISOString();

const logActivity = (action: string, entity: string, entityId: Id, description: string) => {
  const events = load('activity');
  events.push({ id: newId('act'), action, entity, entityId, description, date: nowIso() });
  save('activity', events);
};

/** Balance = successful credits minus successful debits. Never stored. */
export const computeBalance = (transactions: Transaction[]): number =>
  transactions.reduce(
    (sum, t) => (t.status !== 'successful' ? sum : sum + (t.type === 'credit' ? t.amount : -t.amount)),
    0
  );

export const getDemoBalance = () => computeBalance(load('transactions'));

const itemDate = (item: object): string => {
  const r = item as { date?: string; createdAt?: string };
  return r.date ?? r.createdAt ?? '';
};

/** Date-only bounds (YYYY-MM-DD) mean the user's local day; full timestamps are used as given. */
const bound = (v: string, end: boolean): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return v;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  return (end ? new Date(y, mo, d, 23, 59, 59, 999) : new Date(y, mo, d, 0, 0, 0, 0)).toISOString();
};

function query<T extends object>(items: T[], p: ListParams = {}, searchKeys?: string[]): ListResult<T> {
  let rows = items;
  if (p.search) {
    const s = p.search.toLowerCase();
    rows = rows.filter((row) =>
      Object.entries(row).some(
        ([k, v]) =>
          typeof v === 'string' && (searchKeys ? searchKeys.includes(k) : k !== 'id') && v.toLowerCase().includes(s)
      )
    );
  }
  if (p.customerId) rows = rows.filter((r) => (r as { customerId?: string }).customerId === p.customerId);
  if (p.paymentLinkId) rows = rows.filter((r) => (r as { paymentLinkId?: string }).paymentLinkId === p.paymentLinkId);
  if (p.refundOf) rows = rows.filter((r) => (r as { refundOf?: string }).refundOf === p.refundOf);
  if (p.status) rows = rows.filter((r) => (r as { status?: string }).status === p.status);
  if (p.type) rows = rows.filter((r) => (r as { type?: string }).type === p.type);
  if (p.from) {
    const from = bound(p.from, false);
    rows = rows.filter((r) => itemDate(r) >= from);
  }
  if (p.to) {
    const to = bound(p.to, true);
    rows = rows.filter((r) => itemDate(r) <= to);
  }
  const first = items[0] as object | undefined;
  const sort = p.sort ?? (first && 'date' in first ? 'date' : first && 'createdAt' in first ? 'createdAt' : undefined);
  const dir = p.direction ?? 'desc';
  if (sort) {
    rows = [...rows].sort((a, b) => {
      const x = (a as Record<string, unknown>)[sort] as string | number;
      const y = (b as Record<string, unknown>)[sort] as string | number;
      const c = x < y ? -1 : x > y ? 1 : 0;
      return dir === 'asc' ? c : -c;
    });
  }
  const limit = Math.max(1, p.limit ?? 10);
  const page = Math.max(1, p.page ?? 1);
  return { items: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit };
}

const findOrFail = <T extends { id: Id }>(items: T[], id: Id, label: string): T =>
  items.find((i) => i.id === id) ?? fail(`${label} not found`, 404);

/* ------------------------------------------
   FILES (IndexedDB, metadata only when unavailable)
------------------------------------------- */

const storeBlob = async (fileId: string, file: File): Promise<void> => {
  let db: IDBDatabase | undefined;
  try {
    if (typeof indexedDB === 'undefined') return;
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('strack-demo', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    const conn = db;
    await new Promise<void>((resolve, reject) => {
      const tx = conn.transaction('files', 'readwrite');
      tx.objectStore('files').put(file, fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB aborted'));
    });
  } catch {
    // Metadata is still saved; the file content just isn't kept.
  } finally {
    try {
      db?.close();
    } catch {
      // Ignore.
    }
  }
};

const clearBlobs = async () => {
  try {
    if (typeof indexedDB === 'undefined') return;
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('strack-demo');
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  } catch {
    // Ignore.
  }
};

/* ------------------------------------------
   USER / COMPLIANCE (mirrors strack-server user.service)
------------------------------------------- */

const PERSONAL = ['firstName', 'lastName', 'email', 'phone', 'dob', 'bvn'] as const;
const BUSINESS = ['businessName', 'businessEmail', 'rcNumber', 'businessType', 'industry', 'businessAddress'] as const;
const DOC_TYPES: DocumentType[] = ['cac', 'memorandum', 'utility', 'validId'];

const withProgress = (u: User): User => {
  const rec = u as unknown as Record<string, unknown>;
  return {
    ...u,
    complianceProgress: {
      personalInformation: PERSONAL.every((f) => !!rec[f]),
      businessDetails: BUSINESS.every((f) => !!rec[f]),
      businessDocuments: DOC_TYPES.every((t) => !!u.documents?.[t]),
    },
  };
};

const assertEditable = (u: User) => {
  if (u.complianceStatus === 'pending_review' || u.complianceStatus === 'approved') {
    fail('Your details are under review or approved and can no longer be edited', 409);
  }
};

const markInProgress = (u: User): User =>
  u.complianceStatus === 'not_started' || u.complianceStatus === 'rejected' ? { ...u, complianceStatus: 'in_progress' } : u;

/* ------------------------------------------
   THE SOURCE
------------------------------------------- */

function crud<T extends { id: Id }, C extends object>(
  key: 'customers' | 'paymentLinks' | 'bankAccounts',
  prefix: string,
  entity: string,
  label: (item: T) => string,
  build: (input: C) => Omit<T, 'id'>,
  extra?: { onRemove?: (id: Id) => void }
) {
  const rows = () => load(key) as unknown as T[];
  const put = (r: T[]) => save(key, r as never);
  return {
    list: async (p?: ListParams) => query(rows() as object[], p) as unknown as ListResult<T>,
    get: async (id: Id) => findOrFail(rows(), id, entity),
    create: async (input: C) => {
      const item = { id: newId(prefix), ...build(input) } as T;
      put([...rows(), item]);
      logActivity('create', entity, item.id, `Created ${entity} ${label(item)}`);
      return item;
    },
    update: async (id: Id, input: Partial<Omit<T, 'id'>>) => {
      const all = rows();
      const item = { ...findOrFail(all, id, entity), ...input } as T;
      put(all.map((r) => (r.id === id ? item : r)));
      logActivity('update', entity, id, `Updated ${entity} ${label(item)}`);
      return item;
    },
    remove: async (id: Id) => {
      const all = rows();
      const item = findOrFail(all, id, entity);
      extra?.onRemove?.(id);
      put(all.filter((r) => r.id !== id));
      logActivity('delete', entity, id, `Deleted ${entity} ${label(item)}`);
    },
  };
}

const customers = crud<Customer, Omit<Customer, 'id' | 'createdAt'>>(
  'customers', 'cus', 'customer', (c) => c.name, (i) => ({ ...i, createdAt: nowIso() }),
  {
    onRemove: (id) =>
      save('transactions', load('transactions').map((t) => (t.customerId === id ? { ...t, customerId: undefined } : t))),
  }
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors the server rules: trimmed fields, valid email (lowercased), unique email, length limits. */
const cleanCustomer = (input: Partial<Omit<Customer, 'id' | 'createdAt'>>, partial: boolean, selfId?: Id) => {
  const out: Partial<Omit<Customer, 'id' | 'createdAt'>> = {};
  const str = (k: 'name' | 'email' | 'phone' | 'notes', max: number, required: boolean) => {
    if (input[k] === undefined) {
      if (required && !partial) fail(`${k === 'name' ? 'Name' : 'Email'} is required`);
      return;
    }
    const v = String(input[k] ?? '').trim(); // null -> '', never the text "null"
    if (required && !v) fail(`${k === 'name' ? 'Name' : 'Email'} is required`);
    if (v.length > max) fail(`${k} must be at most ${max} characters`);
    out[k] = v;
  };
  str('name', 100, true);
  str('email', 254, true);
  str('phone', 30, false);
  str('notes', 1000, false);
  if (out.email !== undefined) {
    if (!EMAIL_RE.test(out.email)) fail('Invalid email address');
    out.email = out.email.toLowerCase();
    if (load('customers').some((c) => c.id !== selfId && c.email.toLowerCase() === out.email)) {
      fail('A customer with that email already exists', 409);
    }
  }
  return out;
};

const customersCrud = customers;
const customersSource: DataSource['customers'] = {
  ...customersCrud,
  // Search covers name, email and phone only (like the server).
  list: async (p) => {
    const s = p?.search?.trim().toLowerCase();
    const rows = s
      ? load('customers').filter((c) => [c.name, c.email, c.phone].some((v) => v?.toLowerCase().includes(s)))
      : load('customers');
    return query(rows, { ...p, search: undefined });
  },
  create: async (input) => customersCrud.create(cleanCustomer(input, false) as typeof input),
  update: async (id, input) => {
    findOrFail(load('customers'), id, 'Customer');
    return customersCrud.update(id, cleanCustomer(input, true, id));
  },
};

const linksCrud = crud<PaymentLink, Omit<PaymentLink, 'id' | 'createdAt' | 'slug'>>(
  'paymentLinks', 'lnk', 'payment link', (l) => l.title,
  (i) => ({ ...i, slug: uniqueSlug(i.title), createdAt: nowIso() }),
  {
    onRemove: (id) =>
      save('transactions', load('transactions').map((t) => (t.paymentLinkId === id ? { ...t, paymentLinkId: undefined } : t))),
  }
);

/** Same as the server: lowercase title, a-z0-9 and dashes, max 40 chars, plus a random suffix; unique. */
const uniqueSlug = (title: string): string => {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'link';
  const taken = new Set(load('paymentLinks').map((l) => l.slug));
  for (;;) {
    const slug = `${base}-${Math.random().toString(16).slice(2, 10).padEnd(8, '0')}`;
    if (!taken.has(slug)) return slug;
  }
};

/** Largest amount accepted, in kobo (same as the server). */
const MAX_AMOUNT = 100_000_000_000;
const LINK_KEYS = ['title', 'amount', 'description', 'status'];

const checkAmount = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) fail('Enter a valid amount');
  if ((v as number) > MAX_AMOUNT) fail('Amount is too large');
  return v as number;
};

/** Mirrors the server rules: strict keys, trimmed title (1-100), description (max 500), integer kobo amount. */
const cleanLink = (input: Record<string, unknown>, partial: boolean) => {
  if (Object.keys(input).some((k) => !LINK_KEYS.includes(k))) fail('Unrecognized key');
  const out: Record<string, unknown> = {};
  if (input.title !== undefined || !partial) {
    const t = typeof input.title === 'string' ? input.title.trim() : '';
    if (!t) fail('Title is required');
    if (t.length > 100) fail('Title must be at most 100 characters');
    out.title = t;
  }
  if (input.description !== undefined) {
    const d = typeof input.description === 'string' ? input.description.trim() : fail('Invalid description');
    if (d.length > 500) fail('Must be at most 500 characters');
    out.description = d;
  }
  if (input.status !== undefined) {
    if (input.status !== 'active' && input.status !== 'disabled') fail('Invalid status');
    out.status = input.status;
  } else if (!partial) out.status = 'active';
  // null (update only) turns the link into an open-amount link.
  if (input.amount === null && partial) out.amount = undefined;
  else if (input.amount !== undefined) out.amount = checkAmount(input.amount);
  return out;
};

const linksSource: DataSource['paymentLinks'] = {
  ...linksCrud,
  // Search covers title and description only (like the server).
  list: async (p) => {
    const s = p?.search?.trim().toLowerCase();
    const rows = s
      ? load('paymentLinks').filter((l) => [l.title, l.description].some((v) => v?.toLowerCase().includes(s)))
      : load('paymentLinks');
    return query(rows, { ...p, search: undefined });
  },
  create: async (input) => linksCrud.create(cleanLink(input as Record<string, unknown>, false) as typeof input),
  update: async (id, input) => {
    findOrFail(load('paymentLinks'), id, 'Payment link');
    return linksCrud.update(id, cleanLink(input as Record<string, unknown>, true) as typeof input);
  },
  // Same order and codes as the server: 404 link, 409 disabled, 400 amount, 404 customer.
  simulatePayment: async (id, input) => {
    const link = findOrFail(load('paymentLinks'), id, 'Payment link');
    if (link.status !== 'active') fail('This payment link is disabled', 409);
    let amount: number;
    if (link.amount !== undefined) {
      if (input?.amount !== undefined && input.amount !== link.amount) fail('Amount does not match this payment link');
      amount = link.amount;
    } else {
      if (input?.amount === undefined) fail('Enter a valid amount');
      amount = checkAmount(input?.amount);
    }
    const customerId = input?.customerId || undefined;
    if (customerId) findOrFail(load('customers'), customerId, 'Customer');
    const txn: Transaction = {
      id: newId('txn'),
      type: 'credit',
      amount,
      status: 'successful',
      reference: newRef('TXN'),
      channel: 'payment_link',
      description: `Payment for ${link.title}`,
      date: nowIso(),
      customerId,
      paymentLinkId: id,
    };
    save('transactions', [...load('transactions'), txn]);
    logActivity('create', 'transaction', txn.id, `Received payment for ${link.title}`);
    return txn;
  },
};

const accounts = crud<BankAccount, Omit<BankAccount, 'id'>>(
  'bankAccounts', 'bnk', 'bank account', (b) => `${b.bankName} ${b.accountNumber}`, (i) => i,
  {
    onRemove: (id) => {
      if (load('payouts').some((p) => p.bankAccountId === id)) fail('This bank account has payouts and cannot be deleted');
    },
  }
);

/** Only one default account. */
const keepSingleDefault = (defaultId?: Id) => {
  const all = load('bankAccounts');
  if (!all.length) return;
  const id = all.some((a) => a.id === defaultId && a.isDefault) ? defaultId : all.find((a) => a.isDefault)?.id ?? all[0].id;
  save('bankAccounts', all.map((a) => ({ ...a, isDefault: a.id === id })));
};

const MAX_NOTE = 500;

const updateTransaction = (id: Id, patch: Partial<Transaction>, description: string): Transaction => {
  const all = load('transactions');
  const item = { ...findOrFail(all, id, 'Transaction'), ...patch };
  save('transactions', all.map((t) => (t.id === id ? item : t)));
  logActivity('update', 'transaction', id, description);
  return item;
};

export const localSource: DataSource = {
  customers: customersSource,
  paymentLinks: linksSource,
  transactions: {
    // Same as the server: search matches reference and description only.
    list: async (p) => query(load('transactions'), p, ['reference', 'description']),
    get: async (id) => findOrFail(load('transactions'), id, 'Transaction'),
    updateStatus: async (id, status: TransactionStatus) => {
      const all = load('transactions');
      const t = findOrFail(all, id, 'Transaction');
      if (t.payoutId || t.refundOf) fail('Payout and refund transactions cannot be changed');
      if (status !== 'successful' && all.some((x) => x.refundOf === id)) {
        fail('This transaction has been refunded and must stay successful');
      }
      // Block only changes that leave the balance negative and lower than before.
      const next = computeBalance(all.map((x) => (x.id === id ? { ...x, status } : x)));
      if (next < 0 && next < computeBalance(all)) {
        fail('This change would make the balance negative');
      }
      return updateTransaction(id, { status }, `Marked transaction as ${status}`);
    },
    addNote: async (id, note) => {
      const n = note.trim();
      if (n.length > MAX_NOTE) fail(`Note must be at most ${MAX_NOTE} characters`);
      // An empty note clears it.
      return updateTransaction(id, { note: n || undefined }, 'Updated the note on a transaction');
    },
    refund: async (id) => {
      const all = load('transactions');
      const orig = findOrFail(all, id, 'Transaction');
      if (orig.type !== 'credit' || orig.status !== 'successful') fail('Only successful payments can be refunded');
      if (all.some((t) => t.refundOf === id)) fail('This transaction has already been refunded');
      if (computeBalance(all) < orig.amount) fail('Insufficient balance for this refund');
      const refund: Transaction = {
        id: newId('txn'),
        type: 'debit',
        amount: orig.amount,
        status: 'successful',
        reference: newRef('RFD'),
        channel: orig.channel,
        description: `Refund of ${orig.reference}`,
        date: nowIso(),
        customerId: orig.customerId,
        paymentLinkId: orig.paymentLinkId,
        refundOf: orig.id,
      };
      save('transactions', [...all, refund]);
      logActivity('create', 'transaction', refund.id, `Refunded transaction ${orig.reference}`);
      return refund;
    },
  },
  payouts: {
    list: async (p) => query(load('payouts'), p),
    get: async (id) => findOrFail(load('payouts'), id, 'Payout'),
    create: async ({ amount, bankAccountId }) => {
      if (!Number.isInteger(amount) || amount <= 0) fail('Enter a valid amount');
      const account = findOrFail(load('bankAccounts'), bankAccountId, 'Bank account');
      const transactions = load('transactions');
      if (computeBalance(transactions) < amount + PAYOUT_FEE) fail('Insufficient balance');
      const payout: Payout = {
        id: newId('pay'),
        amount,
        fee: PAYOUT_FEE,
        status: 'successful', // instant in demo mode
        reference: newRef('PYT'),
        bankAccountId,
        createdAt: nowIso(),
      };
      const debit: Transaction = {
        id: newId('txn'),
        type: 'debit',
        amount: amount + PAYOUT_FEE,
        status: 'successful',
        reference: newRef('TXN'),
        channel: 'bank_transfer',
        description: `Payout to ${account.bankName} ${account.accountNumber}`,
        date: payout.createdAt,
        payoutId: payout.id,
      };
      save('payouts', [...load('payouts'), payout]);
      save('transactions', [...transactions, debit]);
      logActivity('create', 'payout', payout.id, `Requested a payout of ${amount / 100} NGN`);
      return payout;
    },
  },
  bankAccounts: {
    ...accounts,
    create: async (input) => {
      const created = await accounts.create({ ...input, isDefault: input.isDefault || load('bankAccounts').length === 0 });
      keepSingleDefault(created.isDefault ? created.id : undefined);
      return (await accounts.get(created.id));
    },
    update: async (id, input) => {
      const updated = await accounts.update(id, input);
      keepSingleDefault(input.isDefault ? id : undefined);
      return accounts.get(updated.id);
    },
    remove: async (id) => {
      await accounts.remove(id);
      keepSingleDefault();
    },
  },
  activity: { list: async (p) => query<ActivityEvent>(load('activity'), p) },
  support: {
    list: async (p) => query<SupportTicket>(load('support'), p),
    get: async (id) => findOrFail(load('support'), id, 'Ticket'),
    create: async (input) => {
      const ticket: SupportTicket = { id: newId('tkt'), ...input, status: 'open', replies: [], createdAt: nowIso() };
      save('support', [...load('support'), ticket]);
      logActivity('create', 'support_ticket', ticket.id, `Opened ticket "${ticket.subject}"`);
      return ticket;
    },
    reply: async (id, message) => {
      const all = load('support');
      const t = findOrFail(all, id, 'Ticket');
      const next = { ...t, replies: [...t.replies, { id: newId('rep'), message, from: 'user' as const, date: nowIso() }] };
      save('support', all.map((x) => (x.id === id ? next : x)));
      logActivity('update', 'support_ticket', id, `Replied to ticket "${t.subject}"`);
      return next;
    },
    close: async (id) => {
      const all = load('support');
      const next = { ...findOrFail(all, id, 'Ticket'), status: 'closed' as const };
      save('support', all.map((x) => (x.id === id ? next : x)));
      logActivity('update', 'support_ticket', id, `Closed ticket "${next.subject}"`);
      return next;
    },
  },
  user: {
    get: async () => load('user'),
    update: async (data) => {
      const current = load('user');
      assertEditable(current);
      const next = withProgress(markInProgress({ ...current, ...data }));
      save('user', next);
      logActivity('update', 'user', DEMO_USER_ID, 'Updated compliance details');
      return next;
    },
    uploadDocuments: async (files) => {
      assertEditable(load('user'));
      const uploaded: Partial<Record<DocumentType, StoredDocument>> = {};
      for (const [type, file] of Object.entries(files) as [DocumentType, File | undefined][]) {
        if (!file) continue;
        const stored: StoredDocument = {
          fileId: newId('doc'),
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: nowIso(),
        };
        await storeBlob(stored.fileId, file);
        uploaded[type] = stored;
      }
      // Re-read after the awaits so edits made meanwhile are not lost.
      const current = load('user');
      assertEditable(current);
      const next = withProgress(markInProgress({ ...current, documents: { ...(current.documents ?? {}), ...uploaded } }));
      save('user', next);
      logActivity('update', 'user', DEMO_USER_ID, 'Uploaded compliance documents');
      return next;
    },
    submitCompliance: async () => {
      const current = withProgress(load('user'));
      assertEditable(current);
      const missing = Object.entries(current.complianceProgress ?? {}).filter(([, done]) => !done).map(([k]) => k);
      if (missing.length) fail(`Complete these steps first: ${missing.join(', ')}`);
      const next: User = { ...current, complianceStatus: 'approved', verified: true };
      save('user', next);
      logActivity('update', 'user', DEMO_USER_ID, 'Submitted compliance for verification');
      return next;
    },
  },
  settings: {
    get: async () => load('settings'),
    update: async (input: Partial<Settings>) => {
      const next = { ...load('settings'), ...input };
      save('settings', next);
      logActivity('update', 'settings', 'settings', 'Updated settings');
      return next;
    },
  },
  stats: {
    overview: async (params) => {
      const txns = load('transactions');
      return computeOverview(txns, load('customers'), computeBalance(txns), params);
    },
  },
  reset: async () => {
    for (const k of DATA_KEYS) removeRaw(PREFIX + k);
    removeRaw(SEEDED_KEY);
    await clearBlobs();
    writeAll(generateSeed());
  },
};
