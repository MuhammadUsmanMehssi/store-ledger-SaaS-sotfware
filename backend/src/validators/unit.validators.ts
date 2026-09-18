import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const unitCreateSchema = z.object({
  name: z.string().min(1).max(50),
  abbreviation: z.string().min(1).max(20),
  baseUnitId: z.string().uuid().optional().nullable(),
  conversionFactor: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export const unitUpdateSchema = unitCreateSchema.partial();

export const unitListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export type UnitCreateInput = z.infer<typeof unitCreateSchema>;
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;
