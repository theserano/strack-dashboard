import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { IPaymentLink, PaymentLinkModel } from './payment-link.schema';
import { CustomerModel } from '../customer/customer.schema';
import { TransactionModel } from '../transaction/transaction.schema';
import { createCreditTransaction, toTransactionDto, withOwnerLock } from '../transaction/transaction.service';
import { HttpError } from '../../utils/httpError';
import type {
  CreatePaymentBody,
  CreatePaymentLinkInput,
  ListPaymentLinksQuery,
  UpdatePaymentLinkInput,
} from './payment-link.validation';

// Every query below filters by `owner` (the id from the access token), so one account can never
// read or change another account's payment links, customers or transactions.

const ownerId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  return new Types.ObjectId(userId);
};

const idOf = (id: string, label = 'Payment link') => {
  // A malformed id can't match anything: report it as missing rather than a 500.
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, `${label} not found`);
  return new Types.ObjectId(id);
};

const toDto = (l: IPaymentLink) => ({
  id: String(l._id),
  title: l.title,
  amount: l.amount,
  description: l.description,
  status: l.status,
  slug: l.slug,
  createdAt: l.createdAt.toISOString(),
});

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeSlug = (title: string) => {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return `${base || 'link'}-${randomBytes(4).toString('hex')}`;
};

const isSlugClash = (e: unknown) =>
  (e as { code?: number })?.code === 11000 && 'slug' in ((e as { keyPattern?: object }).keyPattern ?? {});

export const listPaymentLinksService = async (userId: string, q: ListPaymentLinksQuery) => {
  const owner = ownerId(userId);
  const filter: Record<string, unknown> = { owner };
  if (q.status) filter.status = q.status;
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ title: re }, { description: re }];
  }
  const [rows, total] = await Promise.all([
    PaymentLinkModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    PaymentLinkModel.countDocuments(filter),
  ]);
  return { items: rows.map(toDto), total, page: q.page, limit: q.limit };
};

export const getPaymentLinkService = async (userId: string, id: string) => {
  const l = await PaymentLinkModel.findOne({ _id: idOf(id), owner: ownerId(userId) });
  if (!l) throw new HttpError(404, 'Payment link not found');
  return toDto(l);
};

export const createPaymentLinkService = async (userId: string, input: CreatePaymentLinkInput) => {
  const owner = ownerId(userId);
  // The unique index {owner, slug} is the real guard; retry with a fresh suffix on a clash.
  for (let attempt = 0; ; attempt++) {
    try {
      const l = await PaymentLinkModel.create({ ...input, owner, slug: makeSlug(input.title) });
      return toDto(l);
    } catch (e) {
      if (!isSlugClash(e) || attempt >= 4) throw e;
    }
  }
};

export const updatePaymentLinkService = async (userId: string, id: string, input: UpdatePaymentLinkInput) => {
  const { amount, ...rest } = input;
  const update: Record<string, unknown> = {};
  if (Object.keys(rest).length) update.$set = rest;
  if (amount === null) update.$unset = { amount: 1 };
  else if (amount !== undefined) update.$set = { ...(update.$set as object), amount };
  const l = await PaymentLinkModel.findOneAndUpdate({ _id: idOf(id), owner: ownerId(userId) }, update, {
    new: true,
    runValidators: true,
  });
  if (!l) throw new HttpError(404, 'Payment link not found');
  return toDto(l);
};

export const deletePaymentLinkService = async (userId: string, id: string) => {
  const owner = ownerId(userId);
  const _id = idOf(id);
  // Same lock as payments: a payment can't be recorded on a link that is being deleted.
  await withOwnerLock(owner, async (session) => {
    const res = await PaymentLinkModel.deleteOne({ _id, owner }, { session });
    if (!res.deletedCount) throw new HttpError(404, 'Payment link not found');
    // Keep the transactions, but do not leave them pointing at a link that no longer exists.
    await TransactionModel.updateMany({ owner, paymentLinkId: _id }, { $unset: { paymentLinkId: 1 } }, { session });
  });
};

// Simulated payments: no real money moves; payouts are simulated too. Gate behind a flag before
// connecting a real payment rail.
/** Simulates a customer paying the link: records a successful credit. */
export const createPaymentService = async (userId: string, id: string, body: CreatePaymentBody) => {
  const owner = ownerId(userId);
  const linkId = idOf(id);
  const customerOid = body.customerId ? idOf(body.customerId, 'Customer') : undefined;
  const txn = await withOwnerLock(owner, async (session) => {
    const link = await PaymentLinkModel.findOne({ _id: linkId, owner }).session(session);
    if (!link) throw new HttpError(404, 'Payment link not found');
    if (link.status !== 'active') throw new HttpError(409, 'This payment link is disabled');

    let amount: number;
    if (link.amount !== undefined && link.amount !== null) {
      if (body.amount !== undefined && body.amount !== link.amount) {
        throw new HttpError(400, 'Amount does not match this payment link');
      }
      amount = link.amount;
    } else {
      if (body.amount === undefined) throw new HttpError(400, 'Enter a valid amount');
      amount = body.amount;
    }

    let customerId: Types.ObjectId | undefined;
    if (customerOid) {
      const customer = await CustomerModel.findOne({ _id: customerOid, owner }).select('_id').session(session);
      if (!customer) throw new HttpError(404, 'Customer not found');
      customerId = customer._id as Types.ObjectId;
    }

    return createCreditTransaction(
      {
        owner,
        amount,
        channel: 'payment_link',
        description: `Payment for ${link.title}`,
        customerId,
        paymentLinkId: link._id as Types.ObjectId,
      },
      session
    );
  });
  return toTransactionDto(txn);
};
