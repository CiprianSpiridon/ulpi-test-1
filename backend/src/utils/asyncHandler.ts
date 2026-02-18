/**
 * Async handler wrapper for Express route handlers.
 *
 * Wraps async functions so that rejected promises are automatically
 * passed to Express error handling middleware via next(err).
 * This eliminates the need for try-catch blocks in every route handler.
 *
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await userService.findAll();
 *     res.json(users);
 *   }));
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
