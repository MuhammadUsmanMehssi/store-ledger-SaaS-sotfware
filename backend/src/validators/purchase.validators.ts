import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid() });

const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  purchaseDate: z.coerce.date().optional(),
  status: z.enum(['DRAFT', 'COMPLETED']).default('DRAFT'),
  discountAmount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'CREDIT', 'MIXED']).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export const completePurchaseSchema = z.object({
  paidAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'CREDIT', 'MIXED']).optional(),
});

export const recordPurchasePaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'MIXED']).default('CASH'),
  notes: z.string().max(1000).optional(),
});

export const updatePurchaseSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  purchaseDate: z.coerce.date().optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'CREDIT', 'MIXED']).optional(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(purchaseItemSchema).min(1),
});

export const purchaseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z
    .enum(['DRAFT', 'COMPLETED', 'CANCELLED', 'PARTIALLY_RETURNED', 'RETURNED'])
    .optional(),
  supplierId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CompletePurchaseInput = z.infer<typeof completePurchaseSchema>;
export type RecordPurchasePaymentInput = z.infer<typeof recordPurchasePaymentSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
