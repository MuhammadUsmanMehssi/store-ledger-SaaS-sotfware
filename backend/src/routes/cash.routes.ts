import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/cash.controller';
import {
  closeSessionSchema,
  openSessionSchema,
  updateClosingSchema,
  updateOpeningSchema,
} from '../validators/cash.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('cash'));

router.get('/today', controller.getToday);
router.get('/summary', controller.summary);
router.post('/open',
  requireCrudPermission('cash', 'create'), validate({ body: openSessionSchema }), controller.open);
router.post(
  '/close',
  requireCrudPermission('cash', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: closeSessionSchema }),
  controller.close
);
router.post('/reopen',
  requireCrudPermission('cash', 'create'), requireStoreRole('OWNER', 'MANAGER'), controller.reopen);
router.post('/cancel',
  requireCrudPermission('cash', 'create'), requireStoreRole('OWNER', 'MANAGER'), controller.cancel);
router.patch(
  '/opening',
  requireCrudPermission('cash', 'update'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: updateOpeningSchema }),
  controller.updateOpening
);
router.patch(
  '/closing',
  requireCrudPermission('cash', 'update'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: updateClosingSchema }),
  controller.updateClosing
);

export default router;
