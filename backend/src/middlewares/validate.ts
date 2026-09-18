import { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../utils/errors';

type SchemaMap = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export function validate(schemas: SchemaMap) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function assertValid<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }
  return result.data;
}
