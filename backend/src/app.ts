/**
 * Enterprise URL Shortener - Main Application Entry Point
 *
 * Sets up the Express server with:
 * - Pino HTTP request logging with correlation IDs
 * - Security middleware (helmet, CORS, rate limiting)
 * - Compression middleware
 * - API routes (auth, URLs, analytics, redirect)
 * - Health check endpoints
 * - Centralized error handling
 * - Graceful shutdown handling
 *
 * Architecture:
 *   Request -> Middleware Pipeline -> Route -> Service -> Repository -> Database
 *                                                    -> Redis Cache
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { env, logger, connectWithRetry, closeDatabase, connectRedis, closeRedis } from './config';
import { requestLogger, globalRateLimiter, errorHandler } from './middleware';
import {
  authRoutes,
  urlRoutes,
  redirectRoutes,
  analyticsRoutes,
  healthRoutes,
} from './routes';

// ---------------------------------------------------------------------------
// Create Express application
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Trust proxy (required for correct IP detection behind load balancers/Docker)
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Global middleware (order matters)
// ---------------------------------------------------------------------------

// 1. Request logging with correlation IDs (first, so all requests are logged)
app.use(requestLogger);

// 2. Security headers (helmet sets CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// 3. CORS configuration with origin whitelist
app.use(
  cors({
    origin: env.corsOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400, // Preflight cache for 24 hours
  })
);

// 4. Response compression (gzip/deflate)
app.use(compression());

// 5. Body parsing
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 6. Global rate limiter (applied to all routes)
app.use(globalRateLimiter);

// ---------------------------------------------------------------------------
// Health check routes (no auth, no rate limiting beyond global)
// ---------------------------------------------------------------------------
app.use(healthRoutes);

// ---------------------------------------------------------------------------
// API routes (versioned under /api/v1)
// ---------------------------------------------------------------------------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/urls', urlRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// ---------------------------------------------------------------------------
// Redirect route (root level - must be AFTER API routes to avoid conflicts)
// The short code pattern /:shortCode matches at root level
// ---------------------------------------------------------------------------
app.use(redirectRoutes);

// ---------------------------------------------------------------------------
// 404 handler for unmatched routes
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Centralized error handler (MUST be last middleware)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

async function startServer(): Promise<void> {
  try {
    // Connect to PostgreSQL with retry
    logger.info('Connecting to PostgreSQL...');
    await connectWithRetry(5);

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectRedis();

    // Start HTTP server
    const server = app.listen(env.port, () => {
      logger.info(
        { port: env.port, env: env.nodeEnv, url: env.appUrl },
        `${env.appName} server started`
      );
    });

    // Configure server timeouts
    server.keepAliveTimeout = 65000; // Slightly higher than ALB idle timeout
    server.headersTimeout = 66000;
    server.timeout = 120000; // 2 minute request timeout

    // -----------------------------------------------------------------------
    // Graceful shutdown
    // -----------------------------------------------------------------------
    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Shutdown signal received, starting graceful shutdown...');

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connections
          await closeDatabase();

          // Close Redis connection
          await closeRedis();

          logger.info('All connections closed. Process exiting.');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during graceful shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'Uncaught exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ err: reason }, 'Unhandled promise rejection');
      process.exit(1);
    });

  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
void startServer();

// Export app for testing with supertest
export default app;
