import { z } from 'zod';

const enabledModulesSchema = z.record(z.string(), z.boolean()).optional();

export const adminCreateTenantSchema = z.object({
  name: z.string().min(2).max(120),
  businessName: z.string().min(2).max(120).optional(),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  currency: z.string().min(2).max(10).optional(),
  currencySymbol: z.string().min(1).max(10).optional(),
  ownerFullName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8).max(128),
  ownerPhone: z.string().min(5).max(30).optional(),
  enabledModules: enabledModulesSchema,
});

export const adminUpdateTenantSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(120).optional(),
  businessName: z.string().min(2).max(120).nullable().optional(),
  phone: z.string().min(5).max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  enabledModules: enabledModulesSchema,
});

export const adminListTenantsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
});

export type AdminCreateTenantInput = z.infer<typeof adminCreateTenantSchema>;
export type AdminUpdateTenantInput = z.infer<typeof adminUpdateTenantSchema>;
