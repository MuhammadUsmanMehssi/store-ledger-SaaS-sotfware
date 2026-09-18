import { Router } from 'express';
import {
  authenticate,
  requireAuth,
  requireStoreRole,
  requireTenant,
  requireTenantModule,
} from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { tenantLogoUpload } from '../middlewares/upload';
import * as tenantController from '../controllers/tenant.controller';
import { createStoreSchema, updateSettingsSchema } from '../validators/tenant.validators';

const router = Router();

router.post(
  '/',
  authenticate,
  requireAuth,
  validate({ body: createStoreSchema }),
  tenantController.createStore
);

router.get(
  '/settings',
  authenticate,
  requireTenant,
  requireTenantModule('settings_store'),
  tenantController.getSettings
);

router.patch(
  '/settings',
  authenticate,
  requireTenant,
  requireTenantModule('settings_store'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: updateSettingsSchema }),
  tenantController.updateSettings
);

router.post(
  '/logo',
  authenticate,
  requireTenant,
  requireTenantModule('settings_store'),
  requireStoreRole('OWNER', 'MANAGER'),
  tenantLogoUpload.single('logo'),
  tenantController.uploadLogo
);

export default router;
