import { Request, Response } from 'express';
import {
  closeTicketService,
  createTicketService,
  getTicketService,
  listTicketsService,
  replyTicketService,
} from './support.service';
import { createTicketSchema, listTicketsQuerySchema, replySchema } from './support.validation';
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

export const listTicketsController = handle(async (req, res) => {
  const data = await listTicketsService(userIdOf(req), parse(listTicketsQuerySchema.safeParse(req.query)));
  res.status(200).json({ message: 'Tickets fetched successfully', data });
});

export const getTicketController = handle(async (req, res) => {
  const data = await getTicketService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Ticket fetched successfully', data });
});

export const createTicketController = handle(async (req, res) => {
  const data = await createTicketService(userIdOf(req), parse(createTicketSchema.safeParse(req.body)));
  res.status(201).json({ message: 'Ticket created successfully', data });
});

export const replyTicketController = handle(async (req, res) => {
  const data = await replyTicketService(userIdOf(req), String(req.params.id), parse(replySchema.safeParse(req.body)));
  res.status(201).json({ message: 'Reply sent successfully', data });
});

export const closeTicketController = handle(async (req, res) => {
  const data = await closeTicketService(userIdOf(req), String(req.params.id));
  res.status(200).json({ message: 'Ticket closed successfully', data });
});
