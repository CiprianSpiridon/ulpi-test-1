/**
 * Centralized error handling middleware.
 *
 * This is the LAST middleware registered on the Express app.
 * It catches all errors thrown or passed via next(err) and returns
 * a consistent JSON error response.
 *
 * - Operational errors: return the error message and status code
 * - Programming errors: return generic 500 message in production
 * - Validation errors: include field-level error details
 * - All errors are logged with Pino including stack traces
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors';
import { logger } from '../config';

interface ErrorResponse {
  status: 'error';
  statusCode: number;
  code: string;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  timestamp: string;
  path: string;
  stack?: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Use request-scoped logger if available, otherwise fall back to root logger
  const reqLogger = (req as unknown as Record<string, unknown>).log ?? logger;
  const log = reqLogger as typeof logger;

  // Determine if this is an operational (expected) error
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';

  // Log the error with full context
  if (statusCode >= 500) {
    log.error(
      { err, statusCode, path: req.path, method: req.method },
      'Internal server error'
    );
  } else {
    log.warn(
      { err, statusCode, path: req.path, method: req.method },
      err.message
    );
  }

  // Build response
  const response: ErrorResponse = {
    status: 'error',
    statusCode,
    code,
    message: isAppError ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Include validation error details
  if (err instanceof ValidationError) {
    response.errors = err.errors;
  }

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
