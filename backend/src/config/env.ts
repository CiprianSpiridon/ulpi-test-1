/**
 * Environment configuration module.
 * Loads and validates all environment variables at startup.
 * Fails fast if required variables are missing.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (one level up from backend/)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

interface EnvConfig {
  // Application
  nodeEnv: string;
  port: number;
  appUrl: string;
  appName: string;

  // PostgreSQL
  postgresHost: string;
  postgresPort: number;
  postgresDb: string;
  postgresUser: string;
  postgresPassword: string;
  postgresMaxConnections: number;
  databaseUrl: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  redisUrl: string;
  redisCacheTtl: number;
  redisSessionTtl: number;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;

  // Bcrypt
  bcryptSaltRounds: number;

  // Rate limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // URL shortening
  shortCodeLength: number;
  baseRedirectUrl: string;

  // CORS
  corsOrigin: string;

  // Logging
  logLevel: string;

  // Computed
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer, got: ${raw}`);
  }
  return parsed;
}

const nodeEnv = requireEnv('NODE_ENV', 'development');

export const env: EnvConfig = {
  // Application
  nodeEnv,
  port: parseIntEnv('APP_PORT', 3000),
  appUrl: requireEnv('APP_URL', 'http://localhost:3000'),
  appName: requireEnv('APP_NAME', 'URL Shortener'),

  // PostgreSQL
  postgresHost: requireEnv('POSTGRES_HOST', 'localhost'),
  postgresPort: parseIntEnv('POSTGRES_PORT', 5432),
  postgresDb: requireEnv('POSTGRES_DB', 'urlshortener'),
  postgresUser: requireEnv('POSTGRES_USER', 'urlshortener'),
  postgresPassword: requireEnv('POSTGRES_PASSWORD', 'change_me_postgres_password_here'),
  postgresMaxConnections: parseIntEnv('POSTGRES_MAX_CONNECTIONS', 20),
  databaseUrl: requireEnv(
    'DATABASE_URL',
    'postgresql://urlshortener:change_me_postgres_password_here@localhost:5432/urlshortener?sslmode=disable'
  ),

  // Redis
  redisHost: requireEnv('REDIS_HOST', 'localhost'),
  redisPort: parseIntEnv('REDIS_PORT', 6379),
  redisPassword: requireEnv('REDIS_PASSWORD', 'change_me_redis_password_here'),
  redisUrl: requireEnv('REDIS_URL', 'redis://:change_me_redis_password_here@localhost:6379/0'),
  redisCacheTtl: parseIntEnv('REDIS_CACHE_TTL', 3600),
  redisSessionTtl: parseIntEnv('REDIS_SESSION_TTL', 86400),

  // JWT
  jwtSecret: requireEnv('JWT_SECRET', 'change_me_jwt_secret_at_least_32_chars'),
  jwtExpiresIn: requireEnv('JWT_EXPIRES_IN', '24h'),
  jwtRefreshExpiresIn: requireEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Bcrypt
  bcryptSaltRounds: parseIntEnv('BCRYPT_SALT_ROUNDS', 12),

  // Rate limiting
  rateLimitWindowMs: parseIntEnv('RATE_LIMIT_WINDOW_MS', 60000),
  rateLimitMaxRequests: parseIntEnv('RATE_LIMIT_MAX_REQUESTS', 100),

  // URL shortening
  shortCodeLength: parseIntEnv('SHORT_CODE_LENGTH', 7),
  baseRedirectUrl: requireEnv('BASE_REDIRECT_URL', 'http://localhost:3000'),

  // CORS
  corsOrigin: requireEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // Logging
  logLevel: requireEnv('LOG_LEVEL', 'info'),

  // Computed
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
};
