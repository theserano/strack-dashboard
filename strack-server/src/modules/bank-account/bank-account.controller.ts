import { Request, Response } from 'express';
import {
  createBankAccountService,
  deleteBankAccountService,
  getBankAccountService,
  listBankAccountsService,
  updateBankAccountService,
} from './bank-account.service';
import {
  createBankAccountSchema,
  listBankAccountsQuerySchema,
  updateBankAccountSchema,
} from './bank-account.validation';
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

export const listBankAccountsController = handle(async (req, res) => {
  const q = parse(listBankAccountsQuerySchema.safeParse(req.query));
  const data = await listBankAccountsService(userIdOf(req), q);
  res.status(200).json({ message: 'Bank accounts fetched successfully', data });
});

export const getBankAccountController = handle(async (req, res) => {
  const data = await getBankAccountService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Bank account fetched successfully', data });
});

export const createBankAccountController = handle(async (req, res) => {
  const input = parse(createBankAccountSchema.safeParse(req.body));
  const data = await createBankAccountService(userIdOf(req), input);
  res.status(201).json({ message: 'Bank account created successfully', data });
});

export const updateBankAccountController = handle(async (req, res) => {
  const input = parse(updateBankAccountSchema.safeParse(req.body));
  const data = await updateBankAccountService(userIdOf(req), String(req.params.id), input);
  res.status(200).json({ message: 'Bank account updated successfully', data });
});

export const deleteBankAccountController = handle(async (req, res) => {
  await deleteBankAccountService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Bank account deleted successfully', data: null });
});
