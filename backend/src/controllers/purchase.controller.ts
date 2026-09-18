import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as purchaseService from '../services/purchase.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.listPurchases(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Purchases retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await purchaseService.getPurchase(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await purchaseService.createPurchase(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Purchase created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await purchaseService.updateDraftPurchase(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Purchase updated');
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  const data = await purchaseService.completePurchase(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Purchase completed');
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const data = await purchaseService.recordPurchasePayment(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Payment recorded');
});
