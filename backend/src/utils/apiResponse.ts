import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function success<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  pagination?: PaginationMeta
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  });
}

export function created<T>(res: Response, data: T, message = 'Created successfully') {
  return success(res, data, message, 201);
}
