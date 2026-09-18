import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as saleService from '../services/sale.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await saleService.listSales(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Sales retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await saleService.getSale(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await saleService.createSale(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Sale completed');
});

export const hold = asyncHandler(async (req: Request, res: Response) => {
  const data = await saleService.holdSale(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Sale held');
});

export const listHeld = asyncHandler(async (req: Request, res: Response) => {
  const data = await saleService.listHeldSales(req.auth!.tenantId!);
  return success(res, data);
});

export const getHeld = asyncHandler(async (req: Request, res: Response) => {
  const data = await saleService.getHeldSale(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const deleteHeld = asyncHandler(async (req: Request, res: Response) => {
  const data = await saleService.deleteHeldSale(req.auth!.tenantId!, req.params.id as string);
  return success(res, data, 'Held sale deleted');
});
