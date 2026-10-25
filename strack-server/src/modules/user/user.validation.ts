import { z } from 'zod';

const text = z.string().trim().min(1);

// Every field is optional so each compliance step can save just its own fields.
// .strict() rejects anything else (password, accountType, complianceStatus, ...).
export const updateUserSchema = z
  .object({
    firstName: text,
    lastName: text,
    email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'),
    phone: text,
    dob: z.iso
      .date('Date of birth must be YYYY-MM-DD')
      .refine((d) => new Date(d) <= new Date(), "Date of birth can't be in the future"),
    bvn: z.string().regex(/^\d{11}$/, 'BVN must be 11 digits'),

    // Business details step
    businessName: text,
    businessEmail: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid business email'),
    rcNumber: text,
    businessType: text,
    industry: text,
    businessAddress: text,
  })
  .partial()
  .strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const BUSINESS_FIELDS = [
  'businessName',
  'businessEmail',
  'rcNumber',
  'businessType',
  'industry',
  'businessAddress',
] as const;
