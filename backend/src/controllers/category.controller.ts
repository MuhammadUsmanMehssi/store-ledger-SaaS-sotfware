import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as categoryService from '../services/category.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await categoryService.listCategories(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Categories retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.getCategory(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.createCategory(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Category created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.updateCategory(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Category updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.deleteCategory(req.auth!.tenantId!, req.params.id as string);
  return success(res, data, 'Category deleted');
});
