import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 3MB or smaller'
        : err.message || 'Invalid upload';
    return res.status(400).json({
      success: false,
      message,
      code: 'BAD_REQUEST',
      errors: [],
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors ?? [],
    });
  }

  console.error('[UnhandledError]', err);

  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
    code: 'INTERNAL_ERROR',
    errors: env.NODE_ENV === 'development' && err instanceof Error ? [err.message] : [],
  });
}
