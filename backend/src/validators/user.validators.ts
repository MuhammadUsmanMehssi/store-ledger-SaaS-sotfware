import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid() });

const moduleCrudSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

const permissionsSchema = z.record(z.string(), moduleCrudSchema.partial()).optional();

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(30).optional(),
  storeRole: z.enum(['MANAGER', 'CASHIER']),
  permissions: permissionsSchema,
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  storeRole: z.enum(['MANAGER', 'CASHIER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
  permissions: permissionsSchema.nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export { CRUD_ACTIONS, PERMISSION_MODULES } from '../constants/permissions';
