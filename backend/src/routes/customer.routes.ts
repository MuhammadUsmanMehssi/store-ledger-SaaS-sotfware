import { Router } from 'express';
import { authenticate, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { requireIdempotency } from '../middlewares/idempotency';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/customer.controller';
import {
  idParamSchema,
  partyCreateSchema,
  partyListQuerySchema,
  partyUpdateSchema,
  paymentSchema,
} from '../validators/customer.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('customers', 'pos'));

router.get('/', validate({ query: partyListQuerySchema }), controller.list);
router.post('/',
  requireCrudPermission('customers', 'create'), validate({ body: partyCreateSchema }), controller.create);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.patch('/:id',
  requireCrudPermission('customers', 'update'), validate({ params: idParamSchema, body: partyUpdateSchema }), controller.update);
router.delete('/:id',
  requireCrudPermission('customers', 'delete'), validate({ params: idParamSchema }), controller.remove);
router.post(
  '/:id/payments',
  requireIdempotency(),
  requireCrudPermission('customers', 'create'),
  validate({ params: idParamSchema, body: paymentSchema }),
  controller.payment
);
router.get('/:id/transactions', validate({ params: idParamSchema }), controller.transactions);

export default router;
