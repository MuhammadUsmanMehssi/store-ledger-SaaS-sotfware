import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const brandCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const brandUpdateSchema = brandCreateSchema.partial();

export const brandListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export type BrandCreateInput = z.infer<typeof brandCreateSchema>;
export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;
