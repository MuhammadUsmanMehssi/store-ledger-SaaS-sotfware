import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, success } from '../utils/apiResponse';
import * as authService from '../services/auth.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.register(req.body);
  return created(res, data, 'Registration successful');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(req.body);
  return success(res, data, 'Login successful');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.refresh(req.body);
  return success(res, data, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.logout(req.auth!.userId, req.body.refreshToken);
  return success(res, data, 'Logged out successfully');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.me(req.auth!.userId);
  return success(res, data);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.changePassword(req.auth!.userId, req.body);
  return success(res, data, 'Password changed successfully');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.forgotPassword(req.body);
  return success(res, data, data.message);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.resetPassword(req.body);
  return success(res, data, 'Password reset successfully');
});
