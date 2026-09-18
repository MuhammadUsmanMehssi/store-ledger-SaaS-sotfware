import { Router } from 'express';
import {
  authenticate,
  requireCrudPermission,
  requireStoreRole,
  requireTenant,
  requireTenantModule,
} from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/user.controller';
import { createUserSchema, idParamSchema, updateUserSchema } from '../validators/user.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('settings_users'));

router.get(
  '/',
  requireStoreRole('OWNER', 'MANAGER'),
  requireCrudPermission('users', 'view'),
  controller.list,
);
router.post(
  '/',
  requireStoreRole('OWNER'),
  requireCrudPermission('users', 'create'),
  validate({ body: createUserSchema }),
  controller.create,
);
router.patch(
  '/:id',
  requireStoreRole('OWNER'),
  requireCrudPermission('users', 'update'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  controller.update,
);

export default router;
