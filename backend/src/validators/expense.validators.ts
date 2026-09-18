import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid() });

export const expenseCreateSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  expenseDate: z.coerce.date().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE']).default('CASH'),
  description: z.string().max(500).optional(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial().extend({
  isVoided: z.boolean().optional(),
});

export const expenseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  categoryId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const expenseCategoryCreateSchema = z.object({
  name: z.string().min(1).max(120),
});

export const expenseCategoryUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
});

export const expenseCategoryIdParamSchema = z.object({ categoryId: z.string().uuid() });

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
export type ExpenseCategoryCreateInput = z.infer<typeof expenseCategoryCreateSchema>;
export type ExpenseCategoryUpdateInput = z.infer<typeof expenseCategoryUpdateSchema>;
