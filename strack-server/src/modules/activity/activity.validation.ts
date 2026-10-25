import { z } from 'zod';
import { DEFAULT_TZ, validTz } from '../stats/stats.validation';

const day = z.iso.date('Must be YYYY-MM-DD');

export const listActivityQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(1000).default(10),
    search: z.string().trim().max(100).optional(),
    entity: z.string().trim().max(40).optional(),
    // Local calendar days in `tz`, inclusive.
    from: day.optional(),
    to: day.optional(),
    tz: z.string().max(64).refine(validTz, 'Invalid time zone').default(DEFAULT_TZ),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'from must be on or before to' });

export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;
