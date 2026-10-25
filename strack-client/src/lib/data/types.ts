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
  /** ISO dates, inclusive range. */
  from?: IsoDate;
  to?: IsoDate;
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

export interface DataSource {
  customers: Resource<Customer, CreateInput<Customer, 'createdAt'>>;
  paymentLinks: Resource<PaymentLink, CreateInput<PaymentLink, 'createdAt' | 'slug'>>;
  transactions: Pick<Resource<Transaction>, 'list' | 'get'>;
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
  settings: {
    get(): Promise<Settings>;
    update(input: Partial<Settings>): Promise<Settings>;
  };
}
