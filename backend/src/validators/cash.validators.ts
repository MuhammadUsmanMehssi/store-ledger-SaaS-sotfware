import { z } from 'zod';

export const openSessionSchema = z.object({
  openingCash: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
});

export const closeSessionSchema = z.object({
  actualCash: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
});

export const updateOpeningSchema = z.object({
  openingCash: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
});

export const updateClosingSchema = z.object({
  actualCash: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
export type UpdateOpeningInput = z.infer<typeof updateOpeningSchema>;
export type UpdateClosingInput = z.infer<typeof updateClosingSchema>;
