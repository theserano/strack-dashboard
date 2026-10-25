import { Types } from 'mongoose';
import { ITicket, TicketModel } from './support.schema';
import { AUTO_REPLY } from './support.constants';
import { HttpError } from '../../utils/httpError';
import { logActivity } from '../activity/activity.service';
import type { CreateTicketInput, ListTicketsQuery, ReplyInput } from './support.validation';

// Every query filters by `owner` (the id from the access token): one account can never read or change
// another account's tickets. Other owners' ids look like missing tickets (404).

const ownerId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  return new Types.ObjectId(userId);
};

const idOf = (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, 'Ticket not found');
  return new Types.ObjectId(id);
};

const toDto = (t: ITicket) => ({
  id: String(t._id),
  subject: t.subject,
  category: t.category,
  message: t.message,
  status: t.status,
  replies: t.replies.map((r) => ({ id: String(r._id), message: r.message, from: r.from, date: r.date.toISOString() })),
  createdAt: t.createdAt.toISOString(),
});

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The list leaves the threads out (they can be long): each row carries replyCount, the detail has the thread.
export const listTicketsService = async (userId: string, q: ListTicketsQuery) => {
  const owner = ownerId(userId);
  const filter: Record<string, unknown> = { owner };
  if (q.status) filter.status = q.status;
  if (q.search) filter.subject = new RegExp(escapeRegex(q.search), 'i');
  const [rows, total] = await Promise.all([
    TicketModel.aggregate<ITicket & { replyCount: number }>([
      { $match: filter },
      // _id as a tie-breaker keeps pages stable when createdAt values are equal.
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: (q.page - 1) * q.limit },
      { $limit: q.limit },
      { $project: { subject: 1, category: 1, message: 1, status: 1, createdAt: 1, replyCount: { $size: '$replies' } } },
    ]),
    TicketModel.countDocuments(filter),
  ]);
  const items = rows.map((t) => ({
    id: String(t._id),
    subject: t.subject,
    category: t.category,
    message: t.message,
    status: t.status,
    replyCount: t.replyCount,
    createdAt: t.createdAt.toISOString(),
  }));
  return { items, total, page: q.page, limit: q.limit };
};

const findOwned = async (userId: string, id: string) => {
  const t = await TicketModel.findOne({ _id: idOf(id), owner: ownerId(userId) });
  if (!t) throw new HttpError(404, 'Ticket not found');
  return t;
};

export const getTicketService = async (userId: string, id: string) => toDto(await findOwned(userId, id));

export const createTicketService = async (userId: string, input: CreateTicketInput) => {
  const owner = ownerId(userId);
  // The automatic acknowledgement is stored in the same insert, so a ticket never exists without it.
  const t = await TicketModel.create({
    ...input,
    owner,
    replies: [{ message: AUTO_REPLY, from: 'support', date: new Date() }],
  });
  await logActivity(owner, { action: 'create', entity: 'support_ticket', entityId: t._id as Types.ObjectId, description: `Opened ticket "${t.subject}"` });
  return toDto(t);
};

export const replyTicketService = async (userId: string, id: string, input: ReplyInput) => {
  const owner = ownerId(userId);
  // The status condition is part of the update, so a reply cannot slip in after a concurrent close.
  const t = await TicketModel.findOneAndUpdate(
    // 'replies.200' exists only once the thread already holds 200 replies: the cap is part of the update.
    { _id: idOf(id), owner, status: 'open', 'replies.200': { $exists: false } },
    { $push: { replies: { message: input.message, from: 'user', date: new Date() } } },
    { new: true }
  );
  if (!t) {
    const existing = await findOwned(userId, id); // 404 when missing or not theirs
    if (existing.status === 'closed') throw new HttpError(409, 'This ticket is closed');
    throw new HttpError(409, 'This ticket has too many replies');
  }
  await logActivity(owner, { action: 'update', entity: 'support_ticket', entityId: t._id as Types.ObjectId, description: `Replied to ticket "${t.subject}"` });
  return toDto(t);
};

export const closeTicketService = async (userId: string, id: string) => {
  const owner = ownerId(userId);
  const t = await TicketModel.findOneAndUpdate({ _id: idOf(id), owner, status: 'open' }, { $set: { status: 'closed' } }, { new: true });
  if (!t) return getTicketService(userId, id); // already closed (idempotent) or 404
  await logActivity(owner, { action: 'update', entity: 'support_ticket', entityId: t._id as Types.ObjectId, description: `Closed ticket "${t.subject}"` });
  return toDto(t);
};
