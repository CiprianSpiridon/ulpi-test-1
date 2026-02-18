/**
 * JWT authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header, verifies it
 * using jsonwebtoken, and attaches the authenticated user to req.user.
 *
 * Two variants:
 * - authenticate: Requires a valid token (returns 401 if missing/invalid)
 * - optionalAuth: Attaches user if token is present, continues without error if not
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { JwtPayload, AuthenticatedUser, UserRole } from '../types';

/**
 * Extend Express Request to include user property.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Verify and decode a JWT token.
 */
function verifyToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    return payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Authentication failed');
  }
}

/**
 * Required authentication middleware.
 * Returns 401 if no valid token is provided.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  if (!token) {
    next(new UnauthorizedError('No authentication token provided'));
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication middleware.
 * Attaches user if token is present and valid, otherwise continues.
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // Token is invalid but auth is optional; continue without user
  }

  next();
}

/**
 * Authorization middleware factory.
 * Returns middleware that checks if the authenticated user has one of
 * the required roles.
 *
 * Usage:
 *   router.get('/admin', authenticate, authorize('admin', 'superadmin'), handler);
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to access this resource'));
      return;
    }

    next();
  };
}
