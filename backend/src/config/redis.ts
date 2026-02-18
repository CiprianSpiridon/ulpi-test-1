/**
 * Redis client configuration.
 *
 * - Used for caching URL lookups (hot path optimization)
 * - Session storage support
 * - Retry logic with exponential backoff
 * - Graceful shutdown support
 */

import { createClient, RedisClientType } from 'redis';
import { env } from './env';
import { logger } from './logger';

const redisLogger = logger.child({ module: 'redis' });

export type RedisClient = RedisClientType;

let redisClient: RedisClient;

/**
 * Get or create the Redis client singleton.
 */
export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = createClient({
      url: env.redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            redisLogger.error('Redis max reconnection attempts reached');
            return new Error('Redis max reconnection attempts reached');
          }
          const delay = Math.min(retries * 200, 5000);
          redisLogger.warn({ retries, delay }, 'Redis reconnecting...');
          return delay;
        },
        connectTimeout: 10000,
      },
    });

    redisClient.on('error', (err) => {
      redisLogger.error({ err }, 'Redis client error');
    });

    redisClient.on('connect', () => {
      redisLogger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      redisLogger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      redisLogger.warn('Redis client reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Connect to Redis with retry logic.
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  await client.connect();
  redisLogger.info('Redis connection established');
}

/**
 * Gracefully close Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    redisLogger.info('Closing Redis connection...');
    await redisClient.quit();
    redisLogger.info('Redis connection closed');
  }
}
