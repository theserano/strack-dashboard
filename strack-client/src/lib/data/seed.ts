import type {
  ActivityEvent,
  BankAccount,
  Customer,
  PaymentLink,
  Payout,
  Settings,
  SupportTicket,
  Transaction,
} from './types';
import type { User } from '@/lib/features/user/thunkActions';

export interface DemoData {
  customers: Customer[];
  paymentLinks: PaymentLink[];
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  payouts: Payout[];
  activity: ActivityEvent[];
  support: SupportTicket[];
  user: User;
  settings: Settings;
}

export const DEMO_USER_ID = 'demo_user';
export const PAYOUT_FEE = 5000; // 50 naira, in kobo

/** Small deterministic PRNG so the same seed always gives the same data. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Adaeze', 'Chinedu', 'Folake', 'Tunde', 'Ngozi', 'Emeka', 'Aisha', 'Ibrahim', 'Yetunde', 'Segun', 'Amaka', 'Bola', 'Kelechi', 'Zainab', 'Femi', 'Chiamaka', 'Uche', 'Halima', 'Dayo', 'Ifeoma'];
const LAST = ['Okafor', 'Balogun', 'Adeyemi', 'Nwosu', 'Bello', 'Okonkwo', 'Lawal', 'Eze', 'Abubakar', 'Ojo', 'Chukwu', 'Ogunleye', 'Musa', 'Obi', 'Afolabi'];
const CHANNELS = ['card', 'bank_transfer', 'ussd', 'qr'];
const LINKS: Array<[string, number | undefined, string]> = [
  ['Monthly Subscription', 1500000, 'Recurring plan payment'],
  ['Consulting Session', 2500000, 'One hour consulting call'],
  ['Event Ticket', 500000, 'General admission'],
  ['Donation', undefined, 'Pay any amount you like'],
  ['Online Course', 3500000, 'Full course access'],
  ['Design Workshop', 1200000, 'Weekend workshop seat'],
  ['Product Deposit', 1000000, 'Deposit for pre-orders'],
  ['Membership Fee', 800000, 'Annual membership'],
];
const BANKS = [
  ['Guaranty Trust Bank (GTBank)', '0123456789'],
  ['Access Bank', '0987654321'],
];

const DAY = 86400000;

export function generateSeed(now: Date = new Date(), seed = 20260101): DemoData {
  const rand = mulberry32(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pad = (n: number, w = 3) => String(n).padStart(w, '0');
  const ago = (days: number, hour = int(8, 20)) => {
    const d = new Date(now.getTime() - days * DAY);
    d.setUTCHours(hour, int(0, 59), int(0, 59), 0);
    // Never in the future (today's hours may be later than "now").
    return (d > now ? new Date(now.getTime() - int(1, 600) * 1000) : d).toISOString();
  };
  const ref = (p: string) => `${p}-${Math.floor(rand() * 1e10).toString(36).toUpperCase().padStart(7, '0')}`;

  const customers: Customer[] = Array.from({ length: 40 }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + int(0, 3)) % LAST.length];
    return {
      id: `cus_${pad(i + 1)}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 1}@example.com`.toLowerCase(),
      phone: `080${int(10000000, 99999999)}`,
      createdAt: ago(int(30, 90)),
    };
  });

  const paymentLinks: PaymentLink[] = LINKS.map(([title, amount, description], i) => ({
    id: `lnk_${pad(i + 1)}`,
    title,
    amount,
    description,
    status: i === 6 ? 'disabled' : 'active',
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    createdAt: ago(int(60, 90)),
  }));

  const bankAccounts: BankAccount[] = BANKS.map(([bankName, accountNumber], i) => ({
    id: `bnk_${pad(i + 1)}`,
    bankName,
    accountNumber,
    accountName: 'Strack Demo Ventures',
    isDefault: i === 0,
    createdAt: ago(90 - i * 10),
  }));

  // 244 credits + 6 payout debits = 250 transactions.
  const transactions: Transaction[] = [];
  for (let i = 0; i < 244; i++) {
    const link = rand() < 0.8 ? pick(paymentLinks) : undefined;
    const customer = pick(customers);
    const r = rand();
    const date = ago(int(0, 89));
    const created = new Date(customer.createdAt) > new Date(date);
    transactions.push({
      id: `txn_${pad(i + 1)}`,
      type: 'credit',
      amount: link?.amount ?? int(20, 500) * 10000,
      status: r < 0.84 ? 'successful' : r < 0.93 ? 'pending' : 'failed',
      reference: ref('TXN'),
      channel: pick(CHANNELS),
      description: link ? `Payment for ${link.title}` : 'Direct payment',
      date,
      customerId: customer.id,
      paymentLinkId: link?.id,
    });
    // Customers can't pay before they exist.
    if (created) customer.createdAt = date;
  }

  const payouts: Payout[] = [];
  for (let i = 0; i < 6; i++) {
    const id = `pay_${pad(i + 1)}`;
    const date = ago(80 - i * 13);
    const amount = int(50, 300) * 10000;
    payouts.push({
      id,
      amount,
      fee: PAYOUT_FEE,
      status: 'successful',
      reference: ref('PYT'),
      bankAccountId: bankAccounts[i % 2 === 0 ? 0 : 1].id,
      bankName: bankAccounts[i % 2 === 0 ? 0 : 1].bankName,
      accountNumber: bankAccounts[i % 2 === 0 ? 0 : 1].accountNumber,
      createdAt: date,
    });
    transactions.push({
      id: `txn_${pad(245 + i)}`,
      type: 'debit',
      amount: amount + PAYOUT_FEE,
      status: 'successful',
      reference: ref('TXN'),
      channel: 'bank_transfer',
      description: 'Payout to bank account',
      date,
      payoutId: id,
    });
  }
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  const activity: ActivityEvent[] = [];
  const log = (action: string, entity: string, entityId: string, description: string, date: string) =>
    activity.push({ id: `act_${pad(activity.length + 1)}`, action, entity, entityId, description, date });
  customers.slice(0, 12).forEach((c) => log('create', 'customer', c.id, `Added customer ${c.name}`, c.createdAt));
  paymentLinks.forEach((l) => log('create', 'payment_link', l.id, `Created payment link ${l.title}`, l.createdAt));
  payouts.forEach((p) => log('create', 'payout', p.id, `Requested a payout of ${p.amount / 100} NGN`, p.createdAt));
  activity.sort((a, b) => b.date.localeCompare(a.date));
  activity.forEach((a, i) => (a.id = `act_${pad(i + 1)}`));

  const support: SupportTicket[] = [
    {
      id: 'tkt_001',
      subject: 'Settlement delayed',
      category: 'payments',
      message: 'My last settlement has not arrived yet.',
      status: 'closed',
      createdAt: ago(40),
      replies: [{ id: 'rep_001', message: 'It has been released. Please check again.', from: 'support', date: ago(39) }],
    },
    {
      id: 'tkt_002',
      subject: 'Change my payout account',
      category: 'account',
      message: 'How do I change my default bank account?',
      status: 'open',
      createdAt: ago(5),
      replies: [],
    },
    {
      id: 'tkt_003',
      subject: 'Payment link not opening',
      category: 'technical',
      message: 'A customer says my link shows an error.',
      status: 'open',
      createdAt: ago(2),
      replies: [{ id: 'rep_002', message: 'Thanks, we are looking into it.', from: 'support', date: ago(1) }],
    },
  ];

  const docAt = (name: string): { fileId: string; filename: string; mimeType: string; size: number; uploadedAt: string } => ({
    fileId: `doc_${name}`,
    filename: `${name}.pdf`,
    mimeType: 'application/pdf',
    size: 120000,
    uploadedAt: ago(85),
  });

  const user: User = {
    _id: DEMO_USER_ID,
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@strack.app',
    phone: '08012345678',
    accountType: 'business',
    businessName: 'Strack Demo Ventures',
    businessEmail: 'hello@strackdemo.example',
    dob: '1992-04-12',
    bvn: '22222222222',
    rcNumber: 'RC1234567',
    businessType: 'Limited Liability Company',
    industry: 'Technology',
    businessAddress: '12 Marina Road, Lagos',
    documents: { cac: docAt('cac'), memorandum: docAt('memorandum'), utility: docAt('utility'), validId: docAt('validId') },
    verified: true,
    complianceStatus: 'approved',
    complianceProgress: { personalInformation: true, businessDetails: true, businessDocuments: true },
  };

  return {
    customers,
    paymentLinks,
    transactions,
    bankAccounts,
    payouts,
    activity,
    support,
    user,
    settings: {
      notifications: { emailOnPayment: true, emailOnPayout: true, weeklySummary: false },
      currency: 'NGN',
      theme: 'light',
    },
  };
}
