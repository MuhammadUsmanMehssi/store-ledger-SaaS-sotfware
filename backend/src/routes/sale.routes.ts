import { Router } from 'express';
import { authenticate, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/sale.controller';
import {
  createSaleSchema,
  holdSaleSchema,
  idParamSchema,
  saleListQuerySchema,
} from '../validators/sale.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('pos', 'sales_history'));

router.get('/', validate({ query: saleListQuerySchema }), controller.list);
router.post('/', validate({ body: createSaleSchema }), controller.create);
router.get('/held', controller.listHeld);
router.post('/held', validate({ body: holdSaleSchema }), controller.hold);
router.get('/held/:id', validate({ params: idParamSchema }), controller.getHeld);
router.delete('/held/:id', validate({ params: idParamSchema }), controller.deleteHeld);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);

export default router;
