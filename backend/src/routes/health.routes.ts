/**
 * Health check routes.
 *
 * GET /health  - Liveness probe (always returns 200 if process is running)
 * GET /ready   - Readiness probe (checks database and Redis connectivity)
 *
 * These endpoints are excluded from authentication and rate limiting.
 * Used by load balancers, Kubernetes, and Docker health checks.
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /health
 *
 * Liveness probe. Returns 200 if the Express process is running.
 * Does NOT check external dependencies.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /ready
 *
 * Readiness probe. Returns 200 only if all external dependencies
 * (database, Redis) are reachable.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Check PostgreSQL
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    checks.database = { status: 'error', error };
    logger.error({ err }, 'Readiness check: database failed');
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    const start = Date.now();
    await redis.ping();
    checks.redis = {
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    checks.redis = { status: 'error', error };
    logger.error({ err }, 'Readiness check: redis failed');
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
