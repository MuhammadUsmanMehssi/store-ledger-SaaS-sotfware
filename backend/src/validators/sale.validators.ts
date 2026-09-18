import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid() });

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  saleDate: z.coerce.date().optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'CREDIT', 'MIXED']).default('CASH'),
  notes: z.string().max(1000).optional(),
  heldSaleId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1),
});

export const holdSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  referenceName: z.string().max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(saleItemSchema).min(1),
});

export const saleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z
    .enum(['HELD', 'COMPLETED', 'PARTIAL', 'CANCELLED', 'PARTIALLY_RETURNED', 'RETURNED'])
    .optional(),
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type HoldSaleInput = z.infer<typeof holdSaleSchema>;
