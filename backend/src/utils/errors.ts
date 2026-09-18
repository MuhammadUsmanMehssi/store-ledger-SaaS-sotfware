export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: unknown[];
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors?: unknown[]) {
    super(message, 400, 'BAD_REQUEST', errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors?: unknown[]) {
    super(message, 422, 'VALIDATION_ERROR', errors);
  }
}
