import { Request, Response } from 'express';
import { getOverviewService } from './stats.service';
import { overviewQuerySchema } from './stats.validation';
import { HttpError, toErrorResponse } from '../../utils/httpError';

export const getOverviewController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new HttpError(401, 'Unauthorized');
    const parsed = overviewQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid query');
    }
    const data = await getOverviewService(userId, parsed.data);
    return res.status(200).json({ message: 'Overview fetched successfully', data });
  } catch (error) {
    const { status, message } = toErrorResponse(error);
    if (status >= 500) console.error(error);
    res.status(status).json({ message });
  }
};
