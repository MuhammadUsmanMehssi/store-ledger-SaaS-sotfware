import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import { BadRequestError } from '../utils/errors';
import * as adminService from '../services/admin.service';

export const listTenants = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.listTenants({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
  });
  return success(res, result.items, 'Tenants loaded', 200, result.pagination);
});

export const createTenant = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.createTenantWithOwner(req.body);
  return created(res, data, 'Tenant created successfully');
});

export const updateTenant = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const data = await adminService.updateTenant(id, req.body);
  return success(res, data, 'Tenant updated');
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getTenantStats();
  return success(res, data);
});

export const uploadTenantLogo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError('Logo image is required');
  }
  const id = String(req.params.id);
  const data = await adminService.uploadTenantLogo(id, req.file.filename);
  return success(res, data, 'Store logo uploaded');
});
