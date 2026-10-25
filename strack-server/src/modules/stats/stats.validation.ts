import { z } from 'zod';

export const DEFAULT_TZ = 'Africa/Lagos';
export const validTz = (v: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v });
    return true;
  } catch {
    return false;
  }
};

const day = z.iso.date('Must be YYYY-MM-DD');

export const overviewQuerySchema = z
  .object({
    from: day.optional(),
    to: day.optional(),
    tz: z.string().max(64).refine(validTz, 'Invalid time zone').default(DEFAULT_TZ),
    interval: z.enum(['day', 'week', 'month']).default('day'),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'from must be on or before to' });

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
