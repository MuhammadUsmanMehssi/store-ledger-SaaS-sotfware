import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/purchaseReturn.controller';
import {
  createPurchaseReturnSchema,
  idParamSchema,
  purchaseReturnListQuerySchema,
} from '../validators/purchaseReturn.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('purchase_returns'));

router.get('/', validate({ query: purchaseReturnListQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.post(
  '/',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: createPurchaseReturnSchema }),
  controller.create
);

export default router;
