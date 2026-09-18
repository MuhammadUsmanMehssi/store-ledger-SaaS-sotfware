import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as customerService from '../services/customer.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.listCustomers(req.auth!.tenantId!, req.query as never);
  return success(res, result.items, 'Customers retrieved', 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await customerService.getCustomer(req.auth!.tenantId!, req.params.id as string);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await customerService.createCustomer(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Customer created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await customerService.updateCustomer(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Customer updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await customerService.deleteCustomer(req.auth!.tenantId!, req.params.id as string);
  return success(res, data, 'Customer deactivated');
});

export const payment = asyncHandler(async (req: Request, res: Response) => {
  const data = await customerService.recordCustomerPayment(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'Payment recorded');
});

export const transactions = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.listCustomerTransactions(
    req.auth!.tenantId!,
    req.params.id as string,
    req.query as never
  );
  return success(res, result.items, 'Transactions retrieved', 200, result.pagination);
});
