import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createPurchaseReturnSchema = z.object({
  purchaseId: z.string().uuid(),
  reason: z.string().max(500).optional(),
  returnDate: z.coerce.date().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0).optional(),
      })
    )
    .min(1),
});

export const purchaseReturnListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  purchaseId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreatePurchaseReturnInput = z.infer<typeof createPurchaseReturnSchema>;
