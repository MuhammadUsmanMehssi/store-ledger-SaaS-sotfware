import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(2).max(120),
  businessName: z.string().min(2).max(120).optional(),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  currency: z.string().min(2).max(10).optional(),
  currencySymbol: z.string().min(1).max(10).optional(),
});

export const updateSettingsSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  businessName: z.string().min(2).max(120).nullable().optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  currency: z.string().min(2).max(10).optional(),
  currencySymbol: z.string().min(1).max(10).optional(),
  taxEnabled: z.boolean().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  invoicePrefix: z.string().min(1).max(10).optional(),
  purchasePrefix: z.string().min(1).max(10).optional(),
  receiptFooter: z.string().max(500).nullable().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  allowNegativeStock: z.boolean().optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
