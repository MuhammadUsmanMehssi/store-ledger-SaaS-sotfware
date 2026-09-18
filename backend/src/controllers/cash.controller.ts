import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as cashService from '../services/cash.service';

export const getToday = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.getTodaySession(req.auth!.tenantId!);
  return success(res, data);
});

export const open = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.openSession(req.auth!.tenantId!, req.auth!.userId, req.body);
  return created(res, data, 'Cash session opened');
});

export const close = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.closeSession(req.auth!.tenantId!, req.auth!.userId, req.body);
  return success(res, data, 'Cash session closed');
});

export const reopen = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.reopenSession(req.auth!.tenantId!, req.auth!.userId);
  return success(res, data, 'Cash session reopened');
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.cancelSession(req.auth!.tenantId!);
  return success(res, data, 'Cash session cancelled');
});

export const updateOpening = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.updateOpeningCash(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.body
  );
  return success(res, data, 'Opening cash updated');
});

export const updateClosing = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.updateClosingCash(
    req.auth!.tenantId!,
    req.auth!.userId,
    req.body
  );
  return success(res, data, 'Closing cash updated');
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const data = await cashService.getSummary(req.auth!.tenantId!);
  return success(res, data);
});
