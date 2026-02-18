/**
 * Pino logger configuration.
 *
 * - Structured JSON logging in production
 * - Pretty-printed logs in development
 * - Custom serializers for req, res, err objects
 * - Child loggers with correlation IDs used in services
 */

import pino from 'pino';
import { env } from './env';

const serializers: pino.LoggerOptions['serializers'] = {
  req(req) {
    return {
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
      },
      remoteAddress: req.remoteAddress,
    };
  },
  res(res) {
    return {
      statusCode: res.statusCode,
    };
  },
  err: pino.stdSerializers.err,
};

const transportOptions: pino.LoggerOptions = env.isDevelopment
  ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }
  : {};

export const logger = pino({
  name: env.appName,
  level: env.logLevel,
  serializers,
  ...transportOptions,
  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
});

/**
 * Creates a child logger with context metadata.
 * Use for service-level logging with correlation IDs.
 */
export function createChildLogger(bindings: pino.Bindings): pino.Logger {
  return logger.child(bindings);
}
