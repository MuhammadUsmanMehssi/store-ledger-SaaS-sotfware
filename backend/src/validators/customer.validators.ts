import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid() });

export const partyCreateSchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  openingBalance: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export const partyUpdateSchema = partyCreateSchema.partial();

export const partyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE']).default('CASH'),
  notes: z.string().max(500).optional(),
});

export type PartyCreateInput = z.infer<typeof partyCreateSchema>;
export type PartyUpdateInput = z.infer<typeof partyUpdateSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
