import { z } from 'zod';
import { NIGERIAN_BANKS } from './banks';

export const createBankAccountSchema = z
  .object({
    bankName: z.enum(NIGERIAN_BANKS, { error: 'Select a supported bank' }),
    accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
    accountName: z.string().trim().min(1, 'Account name is required').max(100, 'Account name must be at most 100 characters'),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateBankAccountSchema = createBankAccountSchema.partial().strict();

export const listBankAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type ListBankAccountsQuery = z.infer<typeof listBankAccountsQuerySchema>;
