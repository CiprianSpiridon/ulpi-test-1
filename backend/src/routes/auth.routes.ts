/**
 * Authentication routes.
 *
 * POST /api/v1/auth/register  - Create a new user account
 * POST /api/v1/auth/login     - Authenticate and receive JWT tokens
 * POST /api/v1/auth/refresh   - Refresh an expired access token
 *
 * All auth endpoints have strict rate limiting to prevent brute-force attacks.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils';
import { validate, authRateLimiter } from '../middleware';
import { authService } from '../services';
import { registerSchema, loginSchema, refreshTokenSchema } from './validations';

const router = Router();

/**
 * POST /api/v1/auth/register
 *
 * Register a new user account.
 *
 * Request body:
 *   - email (string, required): Valid email address
 *   - password (string, required): Min 8 chars, must contain upper, lower, digit
 *   - displayName (string, optional): User display name
 *
 * Response 201:
 *   - user: { id, email, displayName, role, createdAt, emailVerified }
 *   - tokens: { accessToken, refreshToken, expiresIn }
 */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.status(201).json({ status: 'success', data: result });
  })
);

/**
 * POST /api/v1/auth/login
 *
 * Authenticate a user with email and password.
 *
 * Request body:
 *   - email (string, required): Registered email address
 *   - password (string, required): Account password
 *
 * Response 200:
 *   - user: { id, email, displayName, role, createdAt, emailVerified }
 *   - tokens: { accessToken, refreshToken, expiresIn }
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    res.status(200).json({ status: 'success', data: result });
  })
);

/**
 * POST /api/v1/auth/refresh
 *
 * Refresh an expired access token using a valid refresh token.
 *
 * Request body:
 *   - refreshToken (string, required): Valid refresh token
 *
 * Response 200:
 *   - tokens: { accessToken, refreshToken, expiresIn }
 */
router.post(
  '/refresh',
  authRateLimiter,
  validate(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tokens = await authService.refreshToken(req.body.refreshToken);
    res.status(200).json({ status: 'success', data: { tokens } });
  })
);

export default router;
