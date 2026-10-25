import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { IPayout, PayoutModel } from './payout.schema';
import { PAYOUT_FEE } from './payout.constants';
import { BankAccountModel } from '../bank-account/bank-account.schema';
import { TransactionModel } from '../transaction/transaction.schema';
import { balanceOf, newReference, withOwnerLock } from '../transaction/transaction.service';
import { bound, dayStart } from '../stats/stats.service';
import { HttpError } from '../../utils/httpError';
import type { CreatePayoutInput, ListPayoutsQuery } from './payout.validation';
import { logActivity } from '../activity/activity.service';

// Every query filters by `owner` (the id from the access token): another account's payouts and
// bank accounts are 404.
//
// SETTLEMENT RULE: payouts are simulated (no real rail) and settle instantly. A payout is created
// 'successful' together with its debit transaction (amount + fee, channel 'bank_transfer',
// status 'successful') in ONE Mongo transaction under withOwnerLock, so the debit counts against
// the balance immediately and the same money cannot be paid out twice.

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', currencyDisplay: 'narrowSymbol' }).format(kobo / 100);

const ownerId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  return new Types.ObjectId(userId);
};

const idOf = (id: string, label = 'Payout') => {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, `${label} not found`);
  return new Types.ObjectId(id);
};

export const toPayoutDto = (p: IPayout) => ({
  id: String(p._id),
  amount: p.amount,
  fee: p.fee,
  status: p.status,
  reference: p.reference,
  bankAccountId: String(p.bankAccountId),
  bankName: p.bankName,
  accountNumber: p.accountNumber,
  createdAt: p.createdAt.toISOString(),
});

export const listPayoutsService = async (userId: string, q: ListPayoutsQuery) => {
  const owner = ownerId(userId);
  const filter: Record<string, unknown> = { owner };
  if (q.status) filter.status = q.status;
  if (q.from || q.to) {
    const range: Record<string, Date> = {};
    if (q.from) range.$gte = bound(dayStart(q.from), q.tz);
    if (q.to) range.$lt = bound(new Date(dayStart(q.to).getTime() + 86400000), q.tz);
    filter.createdAt = range;
  }
  const [rows, total] = await Promise.all([
    PayoutModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    PayoutModel.countDocuments(filter),
  ]);
  return { items: rows.map(toPayoutDto), total, page: q.page, limit: q.limit };
};

export const getPayoutService = async (userId: string, id: string) => {
  const p = await PayoutModel.findOne({ _id: idOf(id), owner: ownerId(userId) });
  if (!p) throw new HttpError(404, 'Payout not found');
  return toPayoutDto(p);
};

const MAX_REFERENCE_TRIES = 3;

/** Returns the payout and whether it was newly created (false when an idempotency key matched). */
export const createPayoutService = async (userId: string, input: CreatePayoutInput) => {
  const owner = ownerId(userId);
  const bankAccountId = idOf(input.bankAccountId, 'Bank account');
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await withOwnerLock(owner, async (session) => {
        if (input.idempotencyKey) {
          const prior = await PayoutModel.findOne({ owner, idempotencyKey: input.idempotencyKey }).session(session);
          if (prior) {
            if (prior.amount !== input.amount || String(prior.bankAccountId) !== String(bankAccountId)) {
              throw new HttpError(409, 'This idempotency key was used for a different payout');
            }
            return { payout: prior, created: false };
          }
        }
        const account = await BankAccountModel.findOne({ _id: bankAccountId, owner }).session(session);
        if (!account) throw new HttpError(404, 'Bank account not found');
        if ((await balanceOf(owner, session)) < input.amount + PAYOUT_FEE) throw new HttpError(400, 'Insufficient balance');
        const [p] = await PayoutModel.create(
          [
            {
              owner,
              amount: input.amount,
              fee: PAYOUT_FEE,
              status: 'successful',
              reference: `PYT-${randomBytes(4).toString('hex').toUpperCase()}`,
              bankAccountId,
              bankName: account.bankName,
              accountNumber: account.accountNumber,
              idempotencyKey: input.idempotencyKey,
            },
          ],
          { session }
        );
        await TransactionModel.create(
          [
            {
              owner,
              type: 'debit',
              amount: input.amount + PAYOUT_FEE,
              status: 'successful',
              reference: newReference(),
              channel: 'bank_transfer',
              description: `Payout to ${account.bankName} ${account.accountNumber}`,
              payoutId: p._id,
            },
          ],
          { session }
        );
        await logActivity(owner, { action: 'create', entity: 'payout', entityId: p._id as Types.ObjectId, description: `Requested a payout of ${formatNaira(input.amount)}` }, session);
        return { payout: p, created: true };
      });
      return { payout: toPayoutDto(result.payout), created: result.created };
    } catch (e) {
      // A duplicate-key error aborts the Mongo transaction, so a reference collision retries the whole
      // locked operation with fresh references. A duplicate idempotency key (concurrent first use) also
      // retries: the next attempt finds the first payout.
      const dup = e as { code?: number; keyPattern?: Record<string, unknown> };
      const retryable = dup?.code === 11000 && ('reference' in (dup.keyPattern ?? {}) || 'idempotencyKey' in (dup.keyPattern ?? {}));
      if (!retryable || attempt >= MAX_REFERENCE_TRIES) throw e;
    }
  }
};
