import { ClientSession, Types } from 'mongoose';
import { BankAccountModel, IBankAccount } from './bank-account.schema';
import { PayoutModel } from '../payout/payout.schema';
import { withOwnerLock } from '../transaction/transaction.service';
import { HttpError } from '../../utils/httpError';
import type { CreateBankAccountInput, ListBankAccountsQuery, UpdateBankAccountInput } from './bank-account.validation';
import { logActivity } from '../activity/activity.service';

// Every query filters by `owner` (the id from the access token): another account's bank accounts are 404.
// Anything that changes which account is the default, or deletes one, runs in withOwnerLock so it
// cannot interleave with a payout (which reads the account) or another default change.

const ownerId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  return new Types.ObjectId(userId);
};

const idOf = (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, 'Bank account not found');
  return new Types.ObjectId(id);
};

export const toBankAccountDto = (b: IBankAccount) => ({
  id: String(b._id),
  bankName: b.bankName,
  accountNumber: b.accountNumber,
  accountName: b.accountName,
  isDefault: b.isDefault,
});

const mapDuplicate = (e: unknown): never => {
  const dup = e as { code?: number; keyPattern?: Record<string, unknown> };
  if (dup?.code === 11000) {
    // {owner, accountNumber, bankName} is the account index; {owner} (partial) is the single-default index.
    if ('accountNumber' in (dup.keyPattern ?? {})) throw new HttpError(409, 'This bank account already exists');
    throw new HttpError(409, 'Default account changed, please retry');
  }
  throw e;
};

const unsetOtherDefaults = (owner: Types.ObjectId, keep: Types.ObjectId | null, session: ClientSession) =>
  BankAccountModel.updateMany({ owner, isDefault: true, ...(keep ? { _id: { $ne: keep } } : {}) }, { $set: { isDefault: false } }, { session });

export const listBankAccountsService = async (userId: string, q: ListBankAccountsQuery) => {
  const owner = ownerId(userId);
  const filter = { owner };
  const [rows, total] = await Promise.all([
    BankAccountModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    BankAccountModel.countDocuments(filter),
  ]);
  return { items: rows.map(toBankAccountDto), total, page: q.page, limit: q.limit };
};

export const getBankAccountService = async (userId: string, id: string) => {
  const b = await BankAccountModel.findOne({ _id: idOf(id), owner: ownerId(userId) });
  if (!b) throw new HttpError(404, 'Bank account not found');
  return toBankAccountDto(b);
};

export const createBankAccountService = async (userId: string, input: CreateBankAccountInput) => {
  const owner = ownerId(userId);
  try {
    const created = await withOwnerLock(owner, async (session) => {
      // The first account is always the default.
      const isDefault = !!input.isDefault || !(await BankAccountModel.exists({ owner }).session(session));
      if (isDefault) await unsetOtherDefaults(owner, null, session);
      const [b] = await BankAccountModel.create([{ ...input, isDefault, owner }], { session });
      await logActivity(owner, { action: 'create', entity: 'bank account', entityId: b._id as Types.ObjectId, description: `Created bank account ${b.bankName} ${b.accountNumber}` }, session);
      return b;
    });
    return toBankAccountDto(created);
  } catch (e) {
    return mapDuplicate(e);
  }
};

export const updateBankAccountService = async (userId: string, id: string, input: UpdateBankAccountInput) => {
  const owner = ownerId(userId);
  const _id = idOf(id);
  try {
    const updated = await withOwnerLock(owner, async (session) => {
      const b = await BankAccountModel.findOne({ _id, owner }).session(session);
      if (!b) throw new HttpError(404, 'Bank account not found');
      const { isDefault, ...fields } = input;
      // Payouts keep the account they were paid to: once used, its bank details are frozen.
      const changesDetails =
        (fields.bankName !== undefined && fields.bankName !== b.bankName) ||
        (fields.accountNumber !== undefined && fields.accountNumber !== b.accountNumber);
      if (changesDetails && (await PayoutModel.exists({ owner, bankAccountId: _id }).session(session))) {
        throw new HttpError(409, 'This bank account has payouts; add a new account instead');
      }
      b.set(fields);
      // Making an account the default unsets the others. The default cannot be unset directly:
      // make another account the default instead.
      if (isDefault === true && !b.isDefault) {
        await unsetOtherDefaults(owner, _id, session);
        b.isDefault = true;
      }
      await b.save({ session });
      await logActivity(owner, { action: 'update', entity: 'bank account', entityId: _id, description: `Updated bank account ${b.bankName} ${b.accountNumber}` }, session);
      return b;
    });
    return toBankAccountDto(updated);
  } catch (e) {
    return mapDuplicate(e);
  }
};

export const deleteBankAccountService = async (userId: string, id: string) => {
  const owner = ownerId(userId);
  const _id = idOf(id);
  await withOwnerLock(owner, async (session) => {
    const b = await BankAccountModel.findOne({ _id, owner }).session(session);
    if (!b) throw new HttpError(404, 'Bank account not found');
    if (await PayoutModel.exists({ owner, bankAccountId: _id }).session(session)) {
      throw new HttpError(409, 'This bank account has payouts and cannot be deleted');
    }
    await BankAccountModel.deleteOne({ _id, owner }, { session });
    await logActivity(owner, { action: 'delete', entity: 'bank account', entityId: _id, description: `Deleted bank account ${b.bankName} ${b.accountNumber}` }, session);
    if (b.isDefault) {
      // Promote the oldest remaining account so the owner still has a default.
      const next = await BankAccountModel.findOne({ owner }).sort({ createdAt: 1, _id: 1 }).session(session);
      if (next) await BankAccountModel.updateOne({ _id: next._id }, { $set: { isDefault: true } }, { session });
    }
  });
};
