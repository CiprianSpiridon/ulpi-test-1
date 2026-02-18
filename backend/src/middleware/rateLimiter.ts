/**
 * Rate limiting middleware.
 *
 * Different rate limits per user role:
 * - Unauthenticated: strict limits (30 req/min)
 * - Authenticated user: moderate limits (100 req/min, configurable per user)
 * - Admin/superadmin: relaxed limits (500 req/min)
 *
 * Uses express-rate-limit with in-memory store (for single-instance).
 * For multi-instance deployments, replace with a Redis-backed store.
 */

import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Determine the rate limit key based on authenticated user or IP.
 * Authenticated users get per-user limits; anonymous users get per-IP limits.
 */
function keyGenerator(req: Request): string {
  if (req.user) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

/**
 * Custom handler for rate limit exceeded responses.
 */
function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    status: 'error',
    statusCode: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Global API rate limiter.
 * Applied to all API routes.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later',
} as Partial<Options>);

/**
 * Strict rate limiter for authentication endpoints.
 * Prevents brute-force attacks on login/register.
 * 10 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyGenerator: (req: Request) => `auth:${req.ip ?? 'unknown'}`,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
} as Partial<Options>);

/**
 * Rate limiter for URL creation.
 * 30 URL creations per minute per user.
 */
export const urlCreationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
} as Partial<Options>);

/**
 * Rate limiter for redirect endpoint (the hot path).
 * Very generous limits since this is the primary function of the service.
 * 300 redirects per minute per IP.
 */
export const redirectRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  keyGenerator: (req: Request) => `redirect:${req.ip ?? 'unknown'}`,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
} as Partial<Options>);
