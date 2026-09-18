import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/category.controller';
import {
  categoryCreateSchema,
  categoryListQuerySchema,
  categoryUpdateSchema,
  idParamSchema,
} from '../validators/category.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('categories', 'pos'));

router.get('/', validate({ query: categoryListQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.post(
  '/',
  requireCrudPermission('categories', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: categoryCreateSchema }),
  controller.create
);
router.patch(
  '/:id',
  requireCrudPermission('categories', 'update'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: categoryUpdateSchema }),
  controller.update
);
router.delete(
  '/:id',
  requireCrudPermission('categories', 'delete'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema }),
  controller.remove
);

export default router;
