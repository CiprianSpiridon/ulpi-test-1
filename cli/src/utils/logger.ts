/**
 * Pino-based logger for the URL Shortener CLI.
 *
 * Supports structured JSON output in production and pretty-printed
 * output in development. Log level is controlled by CLI flags
 * (--verbose, --quiet) and the LOG_LEVEL environment variable.
 */

import pino from 'pino';

const isDevelopment = process.env['NODE_ENV'] === 'development';

function createLogger(level?: string): pino.Logger {
  const logLevel = level ?? process.env['LOG_LEVEL'] ?? 'info';

  const options: pino.LoggerOptions = {
    level: logLevel,
    name: 'urlshort',
  };

  if (isDevelopment) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(options);
}

let logger = createLogger();

/**
 * Reconfigure the logger level at runtime.
 * Called after CLI flags are parsed.
 */
export function setLogLevel(level: string): void {
  logger = createLogger(level);
}

/**
 * Get the current logger instance.
 */
export function getLogger(): pino.Logger {
  return logger;
}

export { logger };
