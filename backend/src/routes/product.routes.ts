import { Router } from 'express';
import { authenticate, requireStoreRole, requireTenant, requireTenantModule, requireCrudPermission } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { optionalProductImage, productImageUpload } from '../middlewares/upload';
import * as controller from '../controllers/product.controller';
import {
  barcodeParamSchema,
  generateProductCodesSchema,
  idParamSchema,
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
  productVariantsCreateSchema,
} from '../validators/product.validators';
import { BadRequestError } from '../utils/errors';
import type { NextFunction, Request, Response } from 'express';

const router = Router();

function parseVariantsPayload(req: Request, _res: Response, next: NextFunction) {
  if (typeof req.body?.payload === 'string') {
    try {
      req.body = JSON.parse(req.body.payload);
    } catch {
      next(new BadRequestError('Invalid product payload'));
      return;
    }
  }
  next();
}

router.use(authenticate, requireTenant, requireTenantModule('products', 'pos'));

router.get('/', validate({ query: productListQuerySchema }), controller.list);
router.post(
  '/codes/generate',
  requireCrudPermission('products', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ body: generateProductCodesSchema }),
  controller.generateCodes
);
router.post(
  '/variants',
  requireCrudPermission('products', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  optionalProductImage,
  parseVariantsPayload,
  validate({ body: productVariantsCreateSchema }),
  controller.createVariants
);
router.get('/barcode/:barcode', validate({ params: barcodeParamSchema }), controller.getByBarcode);
router.get('/:id', validate({ params: idParamSchema }), controller.getById);
router.post(
  '/',
  requireCrudPermission('products', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  optionalProductImage,
  validate({ body: productCreateSchema }),
  controller.create
);
router.post(
  '/:id/image',
  requireCrudPermission('products', 'create'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema }),
  productImageUpload.single('image'),
  controller.uploadImage
);
router.patch(
  '/:id',
  requireCrudPermission('products', 'update'),
  requireStoreRole('OWNER', 'MANAGER'),
  optionalProductImage,
  validate({ params: idParamSchema, body: productUpdateSchema }),
  controller.update
);
router.delete(
  '/:id',
  requireCrudPermission('products', 'delete'),
  requireStoreRole('OWNER', 'MANAGER'),
  validate({ params: idParamSchema }),
  controller.remove
);

export default router;
