import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule } from '../middlewares/auth';
import { requireIdempotency } from '../middlewares/idempotency';
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

router.use(authenticate, requireTenant, requireTenantModule('suppliers'));

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
  requireIdempotency(),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: supplierPaymentSchema }),
  controller.payment
);
router.post(
  '/:id/refunds',
  requireIdempotency(),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: supplierPaymentSchema }),
  controller.refund
);
router.get('/:id/transactions', validate({ params: idParamSchema }), controller.transactions);

export default router;
