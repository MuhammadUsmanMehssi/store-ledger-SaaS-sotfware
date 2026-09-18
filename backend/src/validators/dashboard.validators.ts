import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
  preset: z
    .enum(['today', 'yesterday', 'week', 'month', 'last_month', 'year', 'custom'])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
