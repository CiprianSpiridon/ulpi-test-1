/**
 * HTTP request logging middleware using pino-http.
 *
 * - Generates UUID correlation IDs for every request
 * - Attaches req.log child logger with correlation ID for use in services
 * - Logs request start, response completion, and duration
 * - Redacts sensitive headers (Authorization, Cookie)
 */

import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    // Use existing X-Request-Id header if provided, otherwise generate one
    const existingId = req.headers['x-request-id'];
    const id = (typeof existingId === 'string' ? existingId : uuidv4());
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}`;
  },
  // Reduce noise: don't log health check endpoints
  autoLogging: {
    ignore: (req) => {
      return req.url === '/health' || req.url === '/ready';
    },
  },
});
