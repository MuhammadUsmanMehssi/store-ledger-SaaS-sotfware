import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import * as inventoryService from '../services/inventory.service';

export const listStock = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.listStock(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Stock retrieved', 200, result.pagination);
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.listMovements(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Movements retrieved', 200, result.pagination);
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const data = await inventoryService.adjustStock(req.auth!.tenantId!, req.auth!.userId, req.body);
  return success(res, data, 'Stock adjusted');
});
