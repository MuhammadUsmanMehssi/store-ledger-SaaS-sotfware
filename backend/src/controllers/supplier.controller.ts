import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as supplierService from '../services/supplier.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await supplierService.listSuppliers(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Suppliers retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await supplierService.getSupplier(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await supplierService.createSupplier(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Supplier created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await supplierService.updateSupplier(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Supplier updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await supplierService.deleteSupplier(req.auth!.tenantId!, req.params.id as string);
  return success(res, data, 'Supplier deactivated');
});

export const payment = asyncHandler(async (req: Request, res: Response) => {
  const data = await supplierService.recordSupplierPayment(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Payment recorded');
});

export const refund = asyncHandler(async (req: Request, res: Response) => {
  const data = await supplierService.recordSupplierRefund(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Refund received from supplier');
});

export const transactions = asyncHandler(async (req: Request, res: Response) => {
  const result = await supplierService.listSupplierTransactions(
    req.auth!.tenantId!,
    req.params.id as string,
    req.query as never
  );
  return success(res, result.items, 'Supplier ledger retrieved', 200, result.pagination);
});
