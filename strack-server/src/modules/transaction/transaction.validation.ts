import { z } from 'zod';
import { DEFAULT_TZ, validTz } from '../stats/stats.validation';
import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from './transaction.schema';

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const day = z.iso.date('Must be YYYY-MM-DD');
export const MAX_NOTE = 500;

export const listTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(1000).default(10),
    search: z.string().trim().max(100).optional(),
    status: z.enum(TRANSACTION_STATUSES).optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    // Local calendar days in `tz`, inclusive.
    from: day.optional(),
    to: day.optional(),
    tz: z.string().max(64).refine(validTz, 'Invalid time zone').default(DEFAULT_TZ),
    customerId: objectId.optional(),
    paymentLinkId: objectId.optional(),
    // The refund of this transaction (at most one).
    refundOf: objectId.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'from must be on or before to' });

// Exactly one of status or note.
export const updateTransactionSchema = z
  .object({
    status: z.enum(TRANSACTION_STATUSES).optional(),
    // Empty string clears the note.
    note: z.string().trim().max(MAX_NOTE, `Note must be at most ${MAX_NOTE} characters`).optional(),
  })
  .strict()
  .refine((b) => (b.status === undefined) !== (b.note === undefined), {
    message: 'Provide exactly one of status or note',
  });

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
