import { z } from 'zod';

const day = z.iso.date('Must be YYYY-MM-DD');

export const overviewQuerySchema = z
  .object({
    from: day.optional(),
    to: day.optional(),
    interval: z.enum(['day', 'week', 'month']).default('day'),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'from must be on or before to' });

export type OverviewQuery = z.infer<typeof overviewQuerySchema>;
