import { Request, Response } from 'express';
import {
  createPayoutService,
  getPayoutService,
  listPayoutsService,
} from './payout.service';
import {
  createPayoutSchema,
  listPayoutsQuerySchema,
} from './payout.validation';
import { HttpError, toErrorResponse } from '../../utils/httpError';

const userIdOf = (req: Request) => {
  const userId = req.user?.userId;
  if (!userId) throw new HttpError(401, 'Unauthorized');
  return userId;
};

const parse = <T>(r: { success: true; data: T } | { success: false; error: { issues: { message: string }[] } }) => {
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? 'Invalid request');
  return r.data;
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

export const listPayoutsController = handle(async (req, res) => {
  const q = parse(listPayoutsQuerySchema.safeParse(req.query));
  const data = await listPayoutsService(userIdOf(req), q);
  res.status(200).json({ message: 'Payouts fetched successfully', data });
});

export const getPayoutController = handle(async (req, res) => {
  const data = await getPayoutService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Payout fetched successfully', data });
});

export const createPayoutController = handle(async (req, res) => {
  const input = parse(createPayoutSchema.safeParse(req.body));
  const data = await createPayoutService(userIdOf(req), input);
  res.status(201).json({ message: 'Payout requested successfully', data });
});

