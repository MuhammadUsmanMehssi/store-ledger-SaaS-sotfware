import { z } from 'zod';
import { dateRangeQuerySchema } from './dashboard.validators';

export const reportQuerySchema = dateRangeQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
