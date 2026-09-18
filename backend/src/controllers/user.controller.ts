import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as userService from '../services/user.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.listUsers(req.auth!.tenantId!);
  return success(res, data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.createUser(req.auth!.tenantId!, req.auth!.storeRole, req.body);
  return created(res, data, 'User created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.updateUser(
    req.auth!.tenantId!,
    req.auth!.storeRole,
    req.auth!.userId,
    req.params.id as string,
    req.body
  );
  return success(res, data, 'User updated');
});
