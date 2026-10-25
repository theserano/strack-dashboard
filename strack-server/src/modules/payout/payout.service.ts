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

// Every query filters by `owner` (the id from the access token): another account's payouts and
// bank accounts are 404.
//
// SETTLEMENT RULE: payouts are simulated (no real rail) and settle instantly. A payout is created
// 'successful' together with its debit transaction (amount + fee, channel 'bank_transfer',
// status 'successful') in ONE Mongo transaction under withOwnerLock, so the debit counts against
// the balance immediately and the same money cannot be paid out twice.

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

export const createPayoutService = async (userId: string, input: CreatePayoutInput) => {
  const owner = ownerId(userId);
  const bankAccountId = idOf(input.bankAccountId, 'Bank account');
  const payout = await withOwnerLock(owner, async (session) => {
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
    return p;
  });
  return toPayoutDto(payout);
};
