import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as service from '../services/saleReturn.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listSaleReturns(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Sale returns retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getSaleReturn(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createSaleReturn(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Sale return created');
});
