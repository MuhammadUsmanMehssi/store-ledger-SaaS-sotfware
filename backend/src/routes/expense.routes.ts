import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import * as controller from '../controllers/expense.controller';
import {
  expenseCategoryCreateSchema,
  expenseCategoryIdParamSchema,
  expenseCategoryUpdateSchema,
  expenseCreateSchema,
  expenseListQuerySchema,
  expenseUpdateSchema,
  idParamSchema,
} from '../validators/expense.validators';

const router = Router();

router.use(authenticate, requireTenant, requireTenantModule('expenses'));

router.get('/categories', controller.listCategories);
router.post(
  '/categories',
  requireCrudPermission('expenses', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: expenseCategoryCreateSchema }),
  controller.createCategory
);
router.patch(
  '/categories/:categoryId',
  requireCrudPermission('expenses', 'update'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: expenseCategoryIdParamSchema, body: expenseCategoryUpdateSchema }),
  controller.updateCategory
);
router.delete(
  '/categories/:categoryId',
  requireCrudPermission('expenses', 'delete'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: expenseCategoryIdParamSchema }),
  controller.removeCategory
);
router.get('/', validate({ query: expenseListQuerySchema }), controller.list);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.post(
  '/',
  requireCrudPermission('expenses', 'create'),
  requireStoreRole('OWNER', 'MANAGER', 'CASHIER'),
  validate({ body: expenseCreateSchema }),
  controller.create
);
router.patch(
  '/:id',
  requireCrudPermission('expenses', 'update'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema, body: expenseUpdateSchema }),
  controller.update
);
router.delete(
  '/:id',
  requireCrudPermission('expenses', 'delete'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema }),
  controller.remove
);

export default router;
