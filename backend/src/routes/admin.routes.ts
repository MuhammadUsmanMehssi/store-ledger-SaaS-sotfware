import { Router } from 'express';
import { platformAdminRequired } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { tenantLogoUpload } from '../middlewares/upload';
import * as adminController from '../controllers/admin.controller';
import {
  adminCreateTenantSchema,
  adminListTenantsSchema,
  adminUpdateTenantSchema,
} from '../validators/admin.validators';

const router = Router();

router.use(...platformAdminRequired);

router.get('/stats', adminController.getStats);

router.get(
  '/tenants',
  validate({ query: adminListTenantsSchema }),
  adminController.listTenants,
);

router.post(
  '/tenants',
  validate({ body: adminCreateTenantSchema }),
  adminController.createTenant,
);

router.patch(
  '/tenants/:id',
  validate({ body: adminUpdateTenantSchema }),
  adminController.updateTenant,
);

router.post(
  '/tenants/:id/logo',
  tenantLogoUpload.single('logo'),
  adminController.uploadTenantLogo,
);

export default router;
