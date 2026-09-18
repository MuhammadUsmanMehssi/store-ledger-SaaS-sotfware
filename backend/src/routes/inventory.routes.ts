import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { requireIdempotency } from '../middlewares/idempotency';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/inventory.controller';
import {
  adjustStockSchema,
  inventoryListQuerySchema,
  movementsQuerySchema,
} from '../validators/inventory.validators';

const router = Router();

router.use(authenticate, requireTenant);

router.get(
  '/stock',
  requireTenantModule('stock', 'pos'),
  validate({ query: inventoryListQuerySchema }),
  controller.listStock
);
router.get(
  '/movements',
  requireTenantModule('stock', 'adjustments'),
  validate({ query: movementsQuerySchema }),
  controller.listMovements
);
router.post(
  '/adjust',
  requireIdempotency(),
  requireTenantModule('adjustments'),
  requireCrudPermission('inventory', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: adjustStockSchema }),
  controller.adjustStock
);

export default router;
