import { Request, Response } from 'express';
import {
  getTransactionService,
  listTransactionsService,
  refundTransactionService,
  updateTransactionService,
} from './transaction.service';
import { listTransactionsQuerySchema, updateTransactionSchema } from './transaction.validation';
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

export const listTransactionsController = handle(async (req, res) => {
  const q = parse(listTransactionsQuerySchema.safeParse(req.query));
  const data = await listTransactionsService(userIdOf(req), q);
  res.status(200).json({ message: 'Transactions fetched successfully', data });
});

export const getTransactionController = handle(async (req, res) => {
  const data = await getTransactionService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Transaction fetched successfully', data });
});

export const updateTransactionController = handle(async (req, res) => {
  const input = parse(updateTransactionSchema.safeParse(req.body ?? {}));
  const data = await updateTransactionService(userIdOf(req), String(req.params.id), input);
  res.status(200).json({ message: 'Transaction updated successfully', data });
});

export const refundTransactionController = handle(async (req, res) => {
  const data = await refundTransactionService(userIdOf(req), String(req.params.id));
  res.status(201).json({ message: 'Transaction refunded successfully', data });
});
