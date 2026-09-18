import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success } from '../utils/apiResponse';
import * as dashboardService from '../services/dashboard.service';

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboardStats(req.auth!.tenantId!, req.query as never);
  return success(res, data);
});
