import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createSaleReturnSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().max(500).optional(),
  returnDate: z.coerce.date().optional(),
  refundMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'CREDIT']).default('CASH'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
      })
    )
    .min(1),
});

export const saleReturnListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  saleId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>;
