import { Router } from 'express';
import { authenticate, requireTenant, requireTenantModule } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/saleReturn.controller';
import {
  createSaleReturnSchema,
  idParamSchema,
  saleReturnListQuerySchema,
} from '../validators/saleReturn.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('pos', 'sales_returns'));

router.get('/', validate({ query: saleReturnListQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.post('/', validate({ body: createSaleReturnSchema }), controller.create);

export default router;
