import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as unitService from '../services/unit.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.listUnits(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Units retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await unitService.getUnit(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await unitService.createUnit(req.auth!.tenantId!, req.body);
  return created(res, data, 'Unit created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await unitService.updateUnit(req.auth!.tenantId!, req.params.id as string, req.body);
  return success(res, data, 'Unit updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await unitService.deleteUnit(req.auth!.tenantId!, req.params.id as string);
  return success(res, data, 'Unit deleted');
});
