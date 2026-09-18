import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/unit.controller';
import {
  idParamSchema,
  unitCreateSchema,
  unitListQuerySchema,
  unitUpdateSchema,
} from '../validators/unit.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('units', 'pos'));

router.get('/', validate({ query: unitListQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.post('/', requireStoreRole('OWNER', 'MANAGER'), validate({ body: unitCreateSchema }), controller.create);
router.patch(
  '/:id',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: unitUpdateSchema }),
  controller.update
);
router.delete(
  '/:id',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema }),
  controller.remove
);

export default router;
