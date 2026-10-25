import { Types } from 'mongoose';
import { UserModel, DEFAULT_SETTINGS } from '../user/user.schema';
import { HttpError } from '../../utils/httpError';
import { logActivity } from '../activity/activity.service';
import type { UpdateSettingsInput } from './settings.validation';

const ownerId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  return new Types.ObjectId(userId);
};

type Stored = { notifications?: Partial<typeof DEFAULT_SETTINGS.notifications>; theme?: string } | undefined;

// Accounts created before settings existed have no sub-document: fill in the defaults.
const toDto = (s: Stored) => ({
  notifications: { ...DEFAULT_SETTINGS.notifications, ...(s?.notifications ?? {}) },
  currency: 'NGN' as const,
  theme: (s?.theme ?? DEFAULT_SETTINGS.theme) as 'light' | 'dark' | 'system',
});

export const getSettingsService = async (userId: string) => {
  const user = await UserModel.findById(ownerId(userId)).select('settings').lean();
  if (!user) throw new HttpError(404, 'User not found');
  return toDto(user.settings);
};

export const updateSettingsService = async (userId: string, input: UpdateSettingsInput) => {
  const owner = ownerId(userId);
  // Dotted paths so changing one toggle never overwrites the others.
  const $set: Record<string, unknown> = {};
  if (input.theme) $set['settings.theme'] = input.theme;
  for (const [k, v] of Object.entries(input.notifications ?? {})) $set[`settings.notifications.${k}`] = v;

  // An update that sets nothing (e.g. {} or {notifications: {}}) is a client bug: reject it and log nothing.
  if (!Object.keys($set).length) throw new HttpError(400, 'Nothing to update');
  const user = await UserModel.findByIdAndUpdate(owner, { $set }, { new: true, runValidators: true }).select('settings').lean();
  if (!user) throw new HttpError(404, 'User not found');
  await logActivity(owner, { action: 'update', entity: 'settings', entityId: owner, description: 'Updated settings' });
  return toDto(user.settings);
};
