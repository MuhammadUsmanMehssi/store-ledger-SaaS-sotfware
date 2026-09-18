import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import {
  absolutePathFromPublicUrl,
  buildProductImageFilename,
  productImagePublicUrl,
  removeUploadedFile,
  writeProductImage,
} from '../middlewares/upload';
import * as productService from '../services/product.service';

type UploadedImage = {
  filename: string;
  buffer: Buffer;
};

function getUploadedImage(req: Request): UploadedImage | null {
  if (!req.file?.buffer) return null;
  return {
    filename: buildProductImageFilename(req.file.originalname),
    buffer: req.file.buffer,
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.listProducts(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Products retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.getProduct(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const getByBarcode = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.getByBarcode(req.auth!.tenantId!, req.params.barcode as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const uploaded = getUploadedImage(req);
  const body = {
    ...req.body,
    ...(uploaded ? { imageUrl: productImagePublicUrl(uploaded.filename) } : {}),
  };

  try {
    const data = await productService.createProduct(
      req.auth!.tenantId!,
      req.auth!.userId,
      body,
      uploaded
        ? async () => {
            await writeProductImage(uploaded.filename, uploaded.buffer);
          }
        : undefined
    );
    return created(res, data, 'Product created');
  } catch (err) {
    if (uploaded) {
      await removeUploadedFile(
        absolutePathFromPublicUrl(productImagePublicUrl(uploaded.filename))
      );
    }
    throw err;
  }
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const uploaded = getUploadedImage(req);
  const body = {
    ...req.body,
    ...(uploaded ? { imageUrl: productImagePublicUrl(uploaded.filename) } : {}),
  };
  const previous = uploaded
    ? await productService.getProduct(req.auth!.tenantId!, req.params.id as string)
    : null;

  try {
    const data = await productService.updateProduct(
      req.auth!.tenantId!,
      req.auth!.userId,
      req.params.id as string,
      body,
      uploaded
        ? async () => {
            await writeProductImage(uploaded.filename, uploaded.buffer);
          }
        : undefined
    );
    if (uploaded && previous?.imageUrl && previous.imageUrl !== data.imageUrl) {
      await removeUploadedFile(absolutePathFromPublicUrl(previous.imageUrl));
    }
    return success(res, data, 'Product updated');
  } catch (err) {
    if (uploaded) {
      await removeUploadedFile(
        absolutePathFromPublicUrl(productImagePublicUrl(uploaded.filename))
      );
    }
    throw err;
  }
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.deleteProduct(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string
  );
  return success(res, data, 'Product deleted');
});

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file?.buffer) {
    return res.status(400).json({ success: false, message: 'Image file is required', errors: [] });
  }
  const filename = buildProductImageFilename(req.file.originalname);
  const imageUrl = productImagePublicUrl(filename);
  const previous = await productService.getProduct(req.auth!.tenantId!, req.params.id as string);

  try {
    const data = await productService.setProductImage(
      req.auth!.tenantId!,
      req.auth!.userId,
      req.params.id as string,
      imageUrl,
      async () => {
        await writeProductImage(filename, req.file!.buffer);
      }
    );
    if (previous.imageUrl && previous.imageUrl !== imageUrl) {
      await removeUploadedFile(absolutePathFromPublicUrl(previous.imageUrl));
    }
    return success(res, data, 'Product image uploaded');
  } catch (err) {
    await removeUploadedFile(absolutePathFromPublicUrl(imageUrl));
    throw err;
  }
});

export const generateCodes = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.generateProductCodes(req.auth!.tenantId!, req.body);
  return success(res, data, 'Codes generated');
});

export const createVariants = asyncHandler(async (req: Request, res: Response) => {
  let body = req.body as Record<string, unknown>;
  if (typeof body.payload === 'string') {
    try {
      body = JSON.parse(body.payload) as Record<string, unknown>;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid product payload', errors: [] });
    }
  }

  const uploaded = getUploadedImage(req);
  const payload = {
    ...body,
    ...(uploaded ? { imageUrl: productImagePublicUrl(uploaded.filename) } : {}),
  };

  try {
    const data = await productService.createProductVariants(
      req.auth!.tenantId!,
      req.auth!.userId,
      payload as never,
      uploaded
        ? async () => {
            await writeProductImage(uploaded.filename, uploaded.buffer);
          }
        : undefined
    );
    return created(res, data, `${data.length} product size(s) created`);
  } catch (err) {
    if (uploaded) {
      await removeUploadedFile(
        absolutePathFromPublicUrl(productImagePublicUrl(uploaded.filename))
      );
    }
    throw err;
  }
});
