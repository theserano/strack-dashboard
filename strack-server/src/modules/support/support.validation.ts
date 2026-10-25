import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_STATUSES } from './support.constants';

export const createTicketSchema = z
  .object({
    subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(120, 'Subject must be at most 120 characters'),
    category: z.enum(TICKET_CATEGORIES, { message: 'Choose a valid category' }),
    message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be at most 2000 characters'),
  })
  .strict();

export const replySchema = z
  .object({ message: z.string().trim().min(1, 'Reply cannot be empty').max(2000, 'Reply must be at most 2000 characters') })
  .strict();

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
  status: z.enum(TICKET_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ReplyInput = z.infer<typeof replySchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
