import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const categoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
