import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/report.controller';
import { reportQuerySchema } from '../validators/report.validators';

const router = Router();

router.use(authenticate, requireTenant, requireStoreRole('OWNER', 'MANAGER'));

router.get(
  '/sales',
  requireTenantModule('report_sales'),
  validate({ query: reportQuerySchema }),
  controller.sales
);
router.get(
  '/purchases',
  requireTenantModule('report_purchases'),
  validate({ query: reportQuerySchema }),
  controller.purchases
);
router.get(
  '/inventory',
  requireTenantModule('report_inventory'),
  validate({ query: reportQuerySchema }),
  controller.inventory
);
router.get(
  '/expenses',
  requireTenantModule('report_expenses'),
  validate({ query: reportQuerySchema }),
  controller.expenses
);
router.get(
  '/profit-loss',
  requireTenantModule('report_profit_loss'),
  validate({ query: reportQuerySchema }),
  controller.profitLoss
);

export default router;
