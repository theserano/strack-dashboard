import { z } from 'zod';
import { PAYMENT_LINK_STATUSES } from './payment-link.schema';

/** Largest amount accepted, in kobo (NGN 1 billion). */
export const MAX_AMOUNT = 100_000_000_000;

const amount = z
  .number({ error: 'Enter a valid amount' })
  .int('Enter a valid amount')
  .min(1, 'Enter a valid amount')
  .max(MAX_AMOUNT, 'Amount is too large');
// Empty string clears an optional field.
const optional = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`);

export const createPaymentLinkSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
    amount: amount.optional(),
    description: optional(500).optional(),
    status: z.enum(PAYMENT_LINK_STATUSES).optional(),
  })
  .strict();

// On update, amount null turns the link into an open-amount link. The slug can't be changed.
export const updatePaymentLinkSchema = createPaymentLinkSchema
  .partial()
  .extend({ amount: amount.nullable().optional() })
  .strict();

export const listPaymentLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum(PAYMENT_LINK_STATUSES).optional(),
});

export const createPaymentBodySchema = z
  .object({
    amount: amount.optional(),
    customerId: z.string().trim().max(64).optional(),
  })
  .strict();

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;
export type UpdatePaymentLinkInput = z.infer<typeof updatePaymentLinkSchema>;
export type ListPaymentLinksQuery = z.infer<typeof listPaymentLinksQuerySchema>;
export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;
