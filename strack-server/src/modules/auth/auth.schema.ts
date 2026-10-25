import { z } from "zod";

export const signupSchema = z.object({
  accountType: z.enum(["individual", "business"]),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  phone: z.string(),
  password: z.string().min(8).refine((p) => Buffer.byteLength(p) <= 72, 'Password is too long (72 bytes at most)'),

  businessName: z.string().optional(),
  businessEmail: z.string().email().optional(),
});

export const loginSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(8),
});

// Same strength rule as signup (min 8). bcrypt only reads the first 72 bytes, so longer input is rejected
// rather than silently truncated.
const newPasswordRule = z
  .string()
  .min(8, 'New password must be at least 8 characters')
  .refine((p) => Buffer.byteLength(p) <= 72, 'New password is too long (72 bytes at most)');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: newPasswordRule,
  })
  .strict();
