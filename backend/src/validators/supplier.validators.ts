import { z } from 'zod';
import {
  idParamSchema,
  partyCreateSchema,
  partyListQuerySchema,
  partyUpdateSchema,
  paymentSchema,
} from './customer.validators';

export {
  idParamSchema,
  partyCreateSchema as supplierCreateSchema,
  partyUpdateSchema as supplierUpdateSchema,
  partyListQuerySchema as supplierListQuerySchema,
  paymentSchema as supplierPaymentSchema,
};

export type SupplierCreateInput = z.infer<typeof partyCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof partyUpdateSchema>;
export type SupplierPaymentInput = z.infer<typeof paymentSchema>;
