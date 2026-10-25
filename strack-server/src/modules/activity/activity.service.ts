import { ClientSession, Types } from 'mongoose';
import { ActivityModel, IActivity } from './activity.schema';
import { bound, dayStart } from '../stats/stats.service';
import { HttpError } from '../../utils/httpError';
import type { ListActivityQuery } from './activity.validation';

export interface ActivityInput {
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string | Types.ObjectId;
  description: string;
}

/**
 * Records one event for `owner`. With a session the write is part of the caller's transaction: it commits
 * (or rolls back) together with the change, and a failure aborts it. Without a session it is best-effort:
 * a logging failure is reported but never fails the request.
 */
export const logActivity = async (owner: Types.ObjectId | string, input: ActivityInput, session?: ClientSession): Promise<void> => {
  const doc = { owner, ...input, entityId: String(input.entityId) };
  if (session) {
    await ActivityModel.create([doc], { session });
    return;
  }
  try {
    await ActivityModel.create(doc);
  } catch (e) {
    console.error('Failed to record activity', e);
  }
};

const toDto = (a: IActivity) => ({
  id: String(a._id),
  action: a.action,
  entity: a.entity,
  entityId: a.entityId,
  description: a.description,
  date: a.createdAt.toISOString(),
});

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listActivityService = async (userId: string, q: ListActivityQuery) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  const filter: Record<string, unknown> = { owner: new Types.ObjectId(userId) };
  if (q.entity) filter.entity = q.entity;
  if (q.from || q.to) {
    const range: Record<string, Date> = {};
    if (q.from) range.$gte = bound(dayStart(q.from), q.tz);
    if (q.to) range.$lt = bound(new Date(dayStart(q.to).getTime() + 86400000), q.tz);
    filter.createdAt = range;
  }
  if (q.search) filter.description = new RegExp(escapeRegex(q.search), 'i');
  const [rows, total] = await Promise.all([
    ActivityModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    ActivityModel.countDocuments(filter),
  ]);
  return { items: rows.map(toDto), total, page: q.page, limit: q.limit };
};
