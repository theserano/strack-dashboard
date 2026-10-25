import { z } from 'zod';

const email = z
  .string()
  .trim()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address');
// Empty string clears an optional field.
const optional = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`);

export const createCustomerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email,
    phone: optional(30).optional(),
    notes: optional(1000).optional(),
  })
  .strict();

export const updateCustomerSchema = createCustomerSchema.partial().strict();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(10),
  search: z.string().trim().max(100).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
