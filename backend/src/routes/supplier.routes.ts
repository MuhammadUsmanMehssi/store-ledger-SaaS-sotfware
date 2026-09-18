import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/supplier.controller';
import {
  idParamSchema,
  supplierCreateSchema,
  supplierListQuerySchema,
  supplierPaymentSchema,
  supplierUpdateSchema,
} from '../validators/supplier.validators';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', validate({ query: supplierListQuerySchema }), controller.list);
router.post(
  '/',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: supplierCreateSchema }),
  controller.create
);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.patch(
  '/:id',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: supplierUpdateSchema }),
  controller.update
);
router.delete(
  '/:id',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema }),
  controller.remove
);
router.post(
  '/:id/payments',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: supplierPaymentSchema }),
  controller.payment
);
router.post(
  '/:id/refunds',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: supplierPaymentSchema }),
  controller.refund
);
router.get('/:id/transactions', validate({ params: idParamSchema }), controller.transactions);

export default router;
