import { z } from 'zod';

export const THEMES = ['light', 'dark', 'system'] as const;

// Strict: unknown keys (including currency, which is fixed to NGN) are rejected.
export const updateSettingsSchema = z
  .object({
    notifications: z
      .object({ emailOnPayment: z.boolean(), emailOnPayout: z.boolean(), weeklySummary: z.boolean() })
      .partial()
      .strict(),
    theme: z.enum(THEMES, { message: 'Theme must be light, dark or system' }),
  })
  .partial()
  .strict();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
