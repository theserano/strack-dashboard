import { randomBytes } from 'crypto';
import mongoose, { ClientSession, Schema, Types, model } from 'mongoose';
import { ITransaction, TransactionModel } from './transaction.schema';
import { bound, dayStart } from '../stats/stats.service';
import { HttpError } from '../../utils/httpError';
import type { ListTransactionsQuery, UpdateTransactionInput } from './transaction.validation';

// Every query filters by `owner` (the id from the access token): another account's transactions are 404.

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
export const createCreditTransaction = async (input: CreditInput, session?: ClientSession) => {
  const [t] = await TransactionModel.create(
    [{ ...input, type: 'credit', status: 'successful', reference: newReference() }],
    { session }
  );
  return t;
};

const ownerId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  return new Types.ObjectId(userId);
};

const idOf = (id: string, label = 'Transaction') => {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, `${label} not found`);
  return new Types.ObjectId(id);
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listTransactionsService = async (userId: string, q: ListTransactionsQuery) => {
  const owner = ownerId(userId);
  const filter: Record<string, unknown> = { owner };
  if (q.status) filter.status = q.status;
  if (q.type) filter.type = q.type;
  if (q.customerId) filter.customerId = idOf(q.customerId, 'Customer');
  if (q.paymentLinkId) filter.paymentLinkId = idOf(q.paymentLinkId, 'Payment link');
  if (q.refundOf) filter.refundOf = idOf(q.refundOf);
  if (q.from || q.to) {
    // Inclusive local days in q.tz: [start of from, start of the day after to).
    const range: Record<string, Date> = {};
    if (q.from) range.$gte = bound(dayStart(q.from), q.tz);
    if (q.to) range.$lt = bound(new Date(dayStart(q.to).getTime() + 86400000), q.tz);
    filter.createdAt = range;
  }
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ reference: re }, { description: re }];
  }
  const [rows, total] = await Promise.all([
    TransactionModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    TransactionModel.countDocuments(filter),
  ]);
  return { items: rows.map(toTransactionDto), total, page: q.page, limit: q.limit };
};

export const getTransactionService = async (userId: string, id: string) => {
  const t = await TransactionModel.findOne({ _id: idOf(id), owner: ownerId(userId) });
  if (!t) throw new HttpError(404, 'Transaction not found');
  return toTransactionDto(t);
};

// One row per owner, written inside every balance-sensitive transaction. Two concurrent
// transactions for the same owner then conflict on it and one is retried, so the balance check
// each runs cannot be made stale by the other (no write skew).
const OwnerLock = model('OwnerLock', new Schema({ seq: { type: Number, default: 0 } }, { versionKey: false }));
export const lockOwner = (owner: Types.ObjectId, session: ClientSession) =>
  OwnerLock.updateOne({ _id: owner }, { $inc: { seq: 1 } }, { upsert: true, session });

/** Successful credits minus successful debits (matches the client computeBalance). */
export const balanceOf = async (owner: Types.ObjectId, session: ClientSession): Promise<number> => {
  const [r] = await TransactionModel.aggregate<{ total: number }>([
    { $match: { owner, status: 'successful' } },
    { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }] } } } },
  ]).session(session);
  return r?.total ?? 0;
};

export const inTransaction = async <T>(fn: (session: ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.connection.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Runs fn in a Mongo transaction after taking the owner's lock row. Concurrent callers for the same
 * owner conflict on that row and one is retried, so checks made inside (balance, "link still exists")
 * cannot be invalidated by another locked operation. Needs a replica set.
 */
export const withOwnerLock = async <T>(owner: Types.ObjectId, fn: (session: ClientSession) => Promise<T>): Promise<T> => {
  // Create the row outside the transaction so concurrent first-time upserts can't fail on a duplicate key.
  try {
    await OwnerLock.updateOne({ _id: owner }, { $setOnInsert: { seq: 0 } }, { upsert: true });
  } catch (e) {
    if ((e as { code?: number })?.code !== 11000) throw e;
  }
  return inTransaction(async (session) => {
    await lockOwner(owner, session);
    return fn(session);
  });
};

const contribution = (t: { type: string; status: string; amount: number }, status = t.status) =>
  status !== 'successful' ? 0 : t.type === 'credit' ? t.amount : -t.amount;

const updateStatus = (owner: Types.ObjectId, id: Types.ObjectId, status: ITransaction['status']) =>
  withOwnerLock(owner, async (session) => {
    const t = await TransactionModel.findOne({ _id: id, owner }).session(session);
    if (!t) throw new HttpError(404, 'Transaction not found');
    if (t.payoutId || t.refundOf) throw new HttpError(409, 'Payout and refund transactions cannot be changed');
    if (status !== 'successful' && (await TransactionModel.exists({ owner, refundOf: id }).session(session))) {
      throw new HttpError(409, 'This transaction has been refunded and must stay successful');
    }
    // Block only changes that leave the balance negative and lower than before.
    const before = await balanceOf(owner, session);
    const next = before - contribution(t) + contribution(t, status);
    if (next < 0 && next < before) throw new HttpError(409, 'This change would make the balance negative');
    t.status = status;
    await t.save({ session });
    return t;
  });

export const updateTransactionService = async (userId: string, id: string, input: UpdateTransactionInput) => {
  const owner = ownerId(userId);
  const _id = idOf(id);
  if (input.status !== undefined) return toTransactionDto(await updateStatus(owner, _id, input.status));
  const t = await TransactionModel.findOneAndUpdate(
    { _id, owner },
    input.note ? { $set: { note: input.note } } : { $unset: { note: 1 } },
    { new: true }
  );
  if (!t) throw new HttpError(404, 'Transaction not found');
  return toTransactionDto(t);
};

export const refundTransactionService = async (userId: string, id: string) => {
  const owner = ownerId(userId);
  const _id = idOf(id);
  try {
    const refund = await withOwnerLock(owner, async (session) => {
      const orig = await TransactionModel.findOne({ _id, owner }).session(session);
      if (!orig) throw new HttpError(404, 'Transaction not found');
      if (orig.type !== 'credit' || orig.status !== 'successful' || orig.refundOf) {
        throw new HttpError(409, 'Only successful payments can be refunded');
      }
      if (await TransactionModel.exists({ owner, refundOf: _id }).session(session)) {
        throw new HttpError(409, 'This transaction has already been refunded');
      }
      if ((await balanceOf(owner, session)) < orig.amount) throw new HttpError(409, 'Insufficient balance for this refund');
      const [created] = await TransactionModel.create(
        [
          {
            owner,
            type: 'debit',
            amount: orig.amount,
            status: 'successful',
            reference: `RFD-${newReference().slice(4)}`,
            channel: orig.channel,
            description: `Refund of ${orig.reference}`,
            customerId: orig.customerId,
            paymentLinkId: orig.paymentLinkId,
            refundOf: orig._id,
          },
        ],
        { session }
      );
      return created;
    });
    return toTransactionDto(refund);
  } catch (e) {
    // The unique {owner, refundOf} index is the backstop if the checks above were ever bypassed.
    const dup = e as { code?: number; keyPattern?: object };
    if (dup?.code === 11000 && 'refundOf' in (dup.keyPattern ?? {})) throw new HttpError(409, 'This transaction has already been refunded');
    throw e;
  }
};
