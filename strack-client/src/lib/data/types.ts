/** Shared entity types. Amounts are integer kobo, ids are strings, dates are ISO strings. */

export type Id = string;
export type IsoDate = string;

export interface Customer {
  id: Id;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: IsoDate;
}

export type PaymentLinkStatus = 'active' | 'disabled';
export interface PaymentLink {
  id: Id;
  title: string;
  /** Kobo. Omitted for an open-amount link. */
  amount?: number;
  description?: string;
  status: PaymentLinkStatus;
  slug: string;
  createdAt: IsoDate;
}

export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'successful' | 'pending' | 'failed';
export interface Transaction {
  id: Id;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string;
  channel?: string;
  description?: string;
  date: IsoDate;
  customerId?: Id;
  paymentLinkId?: Id;
  payoutId?: Id;
  note?: string;
  /** Set on a refund (debit) transaction: the original transaction's id. */
  refundOf?: Id;
}

export interface BankAccount {
  id: Id;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export type PayoutStatus = 'successful' | 'pending' | 'failed';
export interface Payout {
  id: Id;
  amount: number;
  fee: number;
  status: PayoutStatus;
  reference: string;
  bankAccountId: Id;
  createdAt: IsoDate;
}

export interface ActivityEvent {
  id: Id;
  action: string;
  entity: string;
  entityId: Id;
  description: string;
  date: IsoDate;
}

export type TicketStatus = 'open' | 'closed';
export interface TicketReply {
  id: Id;
  message: string;
  from: 'user' | 'support';
  date: IsoDate;
}
export interface SupportTicket {
  id: Id;
  subject: string;
  category: string;
  message: string;
  status: TicketStatus;
  replies: TicketReply[];
  createdAt: IsoDate;
}

export interface Settings {
  notifications: Record<string, boolean>;
  currency: string;
  theme: 'light' | 'dark' | 'system';
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  /** Transactions only: restrict to one customer. */
  customerId?: Id;
  /** ISO dates, inclusive range. */
  from?: IsoDate;
  to?: IsoDate;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Create/update inputs: everything except server/store-generated fields. */
export type CreateInput<T, K extends keyof T = never> = Omit<T, 'id' | K>;
export type UpdateInput<T> = Partial<Omit<T, 'id'>>;

export interface Resource<T, C = CreateInput<T>, U = UpdateInput<T>> {
  list(params?: ListParams): Promise<ListResult<T>>;
  get(id: Id): Promise<T>;
  create(input: C): Promise<T>;
  update(id: Id, input: U): Promise<T>;
  remove(id: Id): Promise<void>;
}

export type StatsInterval = 'day' | 'week' | 'month';

export interface OverviewParams {
  /** Local days (YYYY-MM-DD), inclusive. Default: the last 30 days ending today. */
  from?: IsoDate;
  to?: IsoDate;
  interval?: StatsInterval;
}

export interface RevenuePoint {
  /** Display label, e.g. "Oct 25" or "Oct 2026". */
  label: string;
  /** Bucket start, YYYY-MM-DD (weeks start on Monday). */
  date: string;
  /** Kobo: successful credits in the bucket (empty buckets are 0). */
  amount: number;
}

export interface TopCustomer {
  customerId: Id;
  name: string;
  /** Kobo: successful credits in the period. */
  total: number;
  count: number;
}

/**
 * Overview figures. All amounts are integer kobo. Revenue = successful credits in the period, net of
 * refunds (a credit with a successful refund debit, `refundOf`, is excluded, as are its Top customers
 * totals); payouts = successful debits that are not refunds (refunds are not shown separately); transactionCount and successRate cover every status in the period;
 * balance and customerCount are all-time. Percent changes compare with the equal-length period
 * just before and are null when that period was 0.
 */
export interface Overview {
  balance: number;
  totalRevenue: number;
  totalPayouts: number;
  transactionCount: number;
  customerCount: number;
  /** 0-100, one decimal. 0 when there are no transactions. */
  successRate: number;
  previousPeriod: { totalRevenue: number; transactionCount: number };
  revenueChange: number | null;
  countChange: number | null;
  revenueSeries: RevenuePoint[];
  /** Top 5 by total, ties broken by count then name. */
  topCustomers: TopCustomer[];
  /** Latest 5 in the period (any status). */
  recentTransactions: Transaction[];
}

import type { UpdateUserData, User, DocumentType } from '@/lib/features/user/thunkActions';

export interface DataSource {
  customers: Resource<Customer, CreateInput<Customer, 'createdAt'>>;
  paymentLinks: Resource<PaymentLink, CreateInput<PaymentLink, 'createdAt' | 'slug'>> & {
    /** Demo only in practice: records a successful payment against the link (creates a credit). */
    simulatePayment(id: Id, input?: { amount?: number; customerId?: Id }): Promise<Transaction>;
  };
  transactions: Pick<Resource<Transaction>, 'list' | 'get'> & {
    updateStatus(id: Id, status: TransactionStatus): Promise<Transaction>;
    addNote(id: Id, note: string): Promise<Transaction>;
    /** Creates a linked refund (debit) transaction and returns it. */
    refund(id: Id): Promise<Transaction>;
  };
  payouts: Pick<Resource<Payout>, 'list' | 'get'> & {
    create(input: { amount: number; bankAccountId: Id }): Promise<Payout>;
  };
  bankAccounts: Resource<BankAccount>;
  activity: Pick<Resource<ActivityEvent>, 'list'>;
  support: Pick<Resource<SupportTicket>, 'list' | 'get'> & {
    create(input: { subject: string; category: string; message: string }): Promise<SupportTicket>;
    reply(id: Id, message: string): Promise<SupportTicket>;
    close(id: Id): Promise<SupportTicket>;
  };
  /** The logged-in user's profile and compliance, mirroring the user thunks. */
  user: {
    get(userId?: Id): Promise<User>;
    update(data: UpdateUserData, userId?: Id): Promise<User>;
    uploadDocuments(files: Partial<Record<DocumentType, File>>, userId?: Id): Promise<User>;
    submitCompliance(userId?: Id): Promise<User>;
  };
  stats: { overview(params?: OverviewParams): Promise<Overview> };
  /** Demo mode: wipe local data and re-seed. Not supported by the api source. */
  reset(): Promise<void>;
  settings: {
    get(): Promise<Settings>;
    update(input: Partial<Settings>): Promise<Settings>;
  };
}
