import { Request, Response } from 'express';
import {
  createPaymentLinkService,
  createPaymentService,
  deletePaymentLinkService,
  getPaymentLinkService,
  listPaymentLinksService,
  updatePaymentLinkService,
} from './payment-link.service';
import {
  createPaymentBodySchema,
  createPaymentLinkSchema,
  listPaymentLinksQuerySchema,
  updatePaymentLinkSchema,
} from './payment-link.validation';
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

export const listPaymentLinksController = handle(async (req, res) => {
  const q = parse(listPaymentLinksQuerySchema.safeParse(req.query));
  const data = await listPaymentLinksService(userIdOf(req), q);
  res.status(200).json({ message: 'Payment links fetched successfully', data });
});

export const getPaymentLinkController = handle(async (req, res) => {
  const data = await getPaymentLinkService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Payment link fetched successfully', data });
});

export const createPaymentLinkController = handle(async (req, res) => {
  const input = parse(createPaymentLinkSchema.safeParse(req.body));
  const data = await createPaymentLinkService(userIdOf(req), input);
  res.status(201).json({ message: 'Payment link created successfully', data });
});

export const updatePaymentLinkController = handle(async (req, res) => {
  const input = parse(updatePaymentLinkSchema.safeParse(req.body));
  const data = await updatePaymentLinkService(userIdOf(req), String(req.params.id), input);
  res.status(200).json({ message: 'Payment link updated successfully', data });
});

export const deletePaymentLinkController = handle(async (req, res) => {
  await deletePaymentLinkService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Payment link deleted successfully', data: null });
});

export const createPaymentController = handle(async (req, res) => {
  const input = parse(createPaymentBodySchema.safeParse(req.body ?? {}));
  const data = await createPaymentService(userIdOf(req), String(req.params.id), input);
  res.status(201).json({ message: 'Payment recorded successfully', data });
});
