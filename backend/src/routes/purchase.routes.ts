import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { requireIdempotency } from '../middlewares/idempotency';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/purchase.controller';
import {
  completePurchaseSchema,
  createPurchaseSchema,
  idParamSchema,
  purchaseListQuerySchema,
  recordPurchasePaymentSchema,
  updatePurchaseSchema,
} from '../validators/purchase.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('purchases_list'));

router.get('/', validate({ query: purchaseListQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.post(
  '/',
  requireIdempotency(),
  requireCrudPermission('purchases', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: createPurchaseSchema }),
  controller.create
);
router.patch(
  '/:id',
  requireCrudPermission('purchases', 'update'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: updatePurchaseSchema }),
  controller.update
);
router.post(
  '/:id/complete',
  requireIdempotency(),
  requireCrudPermission('purchases', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: completePurchaseSchema }),
  controller.complete
);
router.post(
  '/:id/payments',
  requireIdempotency(),
  requireCrudPermission('purchases', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: recordPurchasePaymentSchema }),
  controller.recordPayment
);

export default router;
