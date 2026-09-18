import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number(),
  reason: z.string().min(1).max(500),
  unitCost: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const movementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  productId: z.string().uuid().optional(),
  type: z
    .enum(['OPENING', 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT'])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
