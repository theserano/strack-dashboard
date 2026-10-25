import { Types } from 'mongoose';
import { CustomerModel, ICustomer } from './customer.schema';
import { HttpError } from '../../utils/httpError';
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './customer.validation';

// Every query below filters by `owner` (the id from the access token), so one account can never
// read or change another account's customers.

const ownerId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  return new Types.ObjectId(userId);
};

const idOf = (id: string) => {
  // A malformed id can't match anything: report it as missing rather than a 500.
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, 'Customer not found');
  return new Types.ObjectId(id);
};

const toDto = (c: ICustomer) => ({
  id: String(c._id),
  name: c.name,
  email: c.email,
  phone: c.phone,
  notes: c.notes,
  createdAt: c.createdAt.toISOString(),
});

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const duplicate = () => new HttpError(409, 'A customer with that email already exists');

export const listCustomersService = async (userId: string, q: ListCustomersQuery) => {
  const owner = ownerId(userId);
  const filter: Record<string, unknown> = { owner };
  if (q.search) {
    const re = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const [rows, total] = await Promise.all([
    // _id as a tie-breaker keeps pages stable when createdAt values are equal.
    CustomerModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    CustomerModel.countDocuments(filter),
  ]);
  return { items: rows.map(toDto), total, page: q.page, limit: q.limit };
};

export const getCustomerService = async (userId: string, id: string) => {
  const c = await CustomerModel.findOne({ _id: idOf(id), owner: ownerId(userId) });
  if (!c) throw new HttpError(404, 'Customer not found');
  return toDto(c);
};

// The unique index {owner, email} is the real guard; the 11000 mapping covers races.
const mapDuplicate = (e: unknown): never => {
  if ((e as { code?: number })?.code === 11000) throw duplicate();
  throw e;
};

export const createCustomerService = async (userId: string, input: CreateCustomerInput) => {
  const owner = ownerId(userId);
  try {
    const c = await CustomerModel.create({ ...input, owner });
    return toDto(c);
  } catch (e) {
    return mapDuplicate(e);
  }
};

export const updateCustomerService = async (userId: string, id: string, input: UpdateCustomerInput) => {
  const owner = ownerId(userId);
  try {
    const c = await CustomerModel.findOneAndUpdate(
      { _id: idOf(id), owner },
      { $set: input },
      { new: true, runValidators: true }
    );
    if (!c) throw new HttpError(404, 'Customer not found');
    return toDto(c);
  } catch (e) {
    return mapDuplicate(e);
  }
};

export const deleteCustomerService = async (userId: string, id: string) => {
  const res = await CustomerModel.deleteOne({ _id: idOf(id), owner: ownerId(userId) });
  if (!res.deletedCount) throw new HttpError(404, 'Customer not found');
};
