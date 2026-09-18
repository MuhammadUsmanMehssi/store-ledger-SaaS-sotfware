import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import { BadRequestError } from '../utils/errors';
import * as tenantService from '../services/tenant.service';

export const createStore = asyncHandler(async (req: Request, res: Response) => {
  const data = await tenantService.createStore(req.auth!.userId, req.body);
  return created(res, data, 'Store created successfully');
});

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await tenantService.getSettings(req.auth!.tenantId!);
  return success(res, data);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await tenantService.updateSettings(req.auth!.tenantId!, req.body);
  return success(res, data, 'Settings updated');
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError('Logo image is required');
  }
  const data = await tenantService.uploadLogo(req.auth!.tenantId!, req.file.filename);
  return success(res, data, 'Store logo uploaded');
});
