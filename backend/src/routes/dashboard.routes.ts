import { Router } from 'express';
import { authenticate, requireTenant, requireTenantModule } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/dashboard.controller';
import { dateRangeQuerySchema } from '../validators/dashboard.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('dashboard'));

router.get('/stats', validate({ query: dateRangeQuerySchema }), controller.stats);

export default router;
