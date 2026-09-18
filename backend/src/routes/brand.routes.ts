import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  brandCreateSchema,
  brandListQuerySchema,
  brandUpdateSchema,
  idParamSchema,
} from '../validators/brand.validators';
import * as controller from '../controllers/brand.controller';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('brands', 'pos'));

router.get('/', validate({ query: brandListQuerySchema }), controller.list);
router.post(
  '/',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: brandCreateSchema }),
  controller.create
);
router.patch(
  '/:id',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: brandUpdateSchema }),
  controller.update
);
router.delete(
  '/:id',
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema }),
  controller.remove
);

export default router;
