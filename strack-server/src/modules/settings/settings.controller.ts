import { Request, Response } from 'express';
import { getSettingsService, updateSettingsService } from './settings.service';
import { updateSettingsSchema } from './settings.validation';
import { HttpError, toErrorResponse } from '../../utils/httpError';

const userIdOf = (req: Request) => {
  const userId = req.user?.userId;
  if (!userId) throw new HttpError(401, 'Unauthorized');
  return userId;
};

const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      const { status, message } = toErrorResponse(error);
      if (status >= 500) console.error(error);
      res.status(status).json({ message });
    }
  };

export const getSettingsController = handle(async (req, res) => {
  const data = await getSettingsService(userIdOf(req));
  res.status(200).json({ message: 'Settings fetched successfully', data });
});

export const updateSettingsController = handle(async (req, res) => {
  const r = updateSettingsSchema.safeParse(req.body);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? 'Invalid request');
  const data = await updateSettingsService(userIdOf(req), r.data);
  res.status(200).json({ message: 'Settings updated successfully', data });
});
