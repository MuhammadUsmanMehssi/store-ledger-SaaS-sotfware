import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import * as reportService from '../services/report.service';

export const sales = asyncHandler(async (req: Request, res: Response) => {
  const result = await reportService.salesReport(req.auth!.tenantId!, req.query as never);
  return success(res, result, 'Sales report', 200, result.pagination);
});

export const purchases = asyncHandler(async (req: Request, res: Response) => {
  const result = await reportService.purchasesReport(req.auth!.tenantId!, req.query as never);
  return success(res, result, 'Purchases report', 200, result.pagination);
});

export const inventory = asyncHandler(async (req: Request, res: Response) => {
  const result = await reportService.inventoryReport(req.auth!.tenantId!, req.query as never);
  return success(res, result, 'Inventory report', 200, result.pagination);
});

export const expenses = asyncHandler(async (req: Request, res: Response) => {
  const result = await reportService.expensesReport(req.auth!.tenantId!, req.query as never);
  return success(res, result, 'Expenses report', 200, result.pagination);
});

export const profitLoss = asyncHandler(async (req: Request, res: Response) => {
  const data = await reportService.profitLossReport(req.auth!.tenantId!, req.query as never);
  return success(res, data, 'Profit & loss report');
});
