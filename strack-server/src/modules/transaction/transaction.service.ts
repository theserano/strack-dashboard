import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { ITransaction, TransactionModel } from './transaction.schema';

// Minimal helpers shared by other modules. The transaction endpoints themselves come later.

export const newReference = () => `TXN-${randomBytes(6).toString('hex').toUpperCase()}`;

/** Client Transaction shape: the document's createdAt is exposed as `date`. */
export const toTransactionDto = (t: ITransaction) => ({
  id: String(t._id),
  type: t.type,
  amount: t.amount,
  status: t.status,
  reference: t.reference,
  channel: t.channel,
  description: t.description,
  date: t.createdAt.toISOString(),
  customerId: t.customerId ? String(t.customerId) : undefined,
  paymentLinkId: t.paymentLinkId ? String(t.paymentLinkId) : undefined,
  payoutId: t.payoutId ? String(t.payoutId) : undefined,
  note: t.note,
  refundOf: t.refundOf ? String(t.refundOf) : undefined,
});

export interface CreditInput {
  owner: Types.ObjectId;
  amount: number;
  channel: string;
  description?: string;
  customerId?: Types.ObjectId;
  paymentLinkId?: Types.ObjectId;
}

/** Records a successful credit for `owner`. The caller has already checked ownership of the ids. */
export const createCreditTransaction = (input: CreditInput) =>
  TransactionModel.create({ ...input, type: 'credit', status: 'successful', reference: newReference() });
