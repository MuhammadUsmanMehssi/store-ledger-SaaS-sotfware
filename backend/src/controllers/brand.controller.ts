import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as brandService from '../services/brand.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await brandService.listBrands(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Brands retrieved', 200, result.pagination);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await brandService.createBrand(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Brand created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await brandService.updateBrand(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Brand updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await brandService.deleteBrand(req.auth!.tenantId!, req.params.id as string);
  return success(res, data, 'Brand deactivated');
});
