import { Request, Response } from 'express';
import {
  createCustomerService,
  deleteCustomerService,
  getCustomerService,
  listCustomersService,
  updateCustomerService,
} from './customer.service';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customer.validation';
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

export const listCustomersController = handle(async (req, res) => {
  const q = parse(listCustomersQuerySchema.safeParse(req.query));
  const data = await listCustomersService(userIdOf(req), q);
  res.status(200).json({ message: 'Customers fetched successfully', data });
});

export const getCustomerController = handle(async (req, res) => {
  const data = await getCustomerService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Customer fetched successfully', data });
});

export const createCustomerController = handle(async (req, res) => {
  const input = parse(createCustomerSchema.safeParse(req.body));
  const data = await createCustomerService(userIdOf(req), input);
  res.status(201).json({ message: 'Customer created successfully', data });
});

export const updateCustomerController = handle(async (req, res) => {
  const input = parse(updateCustomerSchema.safeParse(req.body));
  const data = await updateCustomerService(userIdOf(req), String(req.params.id), input);
  res.status(200).json({ message: 'Customer updated successfully', data });
});

export const deleteCustomerController = handle(async (req, res) => {
  await deleteCustomerService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Customer deleted successfully', data: null });
});
