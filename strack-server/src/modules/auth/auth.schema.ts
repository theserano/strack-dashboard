import { z } from "zod";

export const signupSchema = z.object({
  accountType: z.enum(["individual", "business"]),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  phone: z.string(),
  password: z.string().min(8),

  businessName: z.string().optional(),
  businessEmail: z.string().email().optional(),
});

export const loginSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(8),
});