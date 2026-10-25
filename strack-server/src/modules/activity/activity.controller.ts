import { Request, Response } from 'express';
import { listActivityService } from './activity.service';
import { listActivityQuerySchema } from './activity.validation';
import { HttpError, toErrorResponse } from '../../utils/httpError';

export const listActivityController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new HttpError(401, 'Unauthorized');
    const r = listActivityQuerySchema.safeParse(req.query);
    if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? 'Invalid request');
    const data = await listActivityService(userId, r.data);
    res.status(200).json({ message: 'Activity fetched successfully', data });
  } catch (error) {
    const { status, message } = toErrorResponse(error);
    if (status >= 500) console.error(error);
    res.status(status).json({ message });
  }
};
