/**
 * PostgreSQL connection pool using node-postgres (pg).
 *
 * - Connection pooling with configurable max connections
 * - Retry logic with exponential backoff on initial connection
 * - Graceful shutdown support
 * - Query logging in development mode
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import { logger } from './logger';

const dbLogger = logger.child({ module: 'database' });

export const pool = new Pool({
  host: env.postgresHost,
  port: env.postgresPort,
  database: env.postgresDb,
  user: env.postgresUser,
  password: env.postgresPassword,
  max: env.postgresMaxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Allow notice messages but don't crash
  allowExitOnIdle: false,
});

// Log pool errors (prevents unhandled error crashes)
pool.on('error', (err) => {
  dbLogger.error({ err }, 'Unexpected database pool error');
});

pool.on('connect', () => {
  dbLogger.debug('New database client connected');
});

/**
 * Execute a parameterized query against the connection pool.
 * All queries MUST use parameterized values to prevent SQL injection.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (env.isDevelopment) {
    dbLogger.debug(
      { query: text, duration, rows: result.rowCount },
      'Database query executed'
    );
  }

  return result;
}

/**
 * Get a client from the pool for transaction support.
 * Always release the client in a finally block.
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute a function within a database transaction.
 * Automatically commits on success or rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Test the database connection with retry logic and exponential backoff.
 * Called at application startup.
 */
export async function connectWithRetry(maxRetries = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query('SELECT NOW() AS current_time');
      dbLogger.info(
        { serverTime: result.rows[0].current_time },
        'Database connection established'
      );
      return;
    } catch (err) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      dbLogger.warn(
        { err, attempt, maxRetries, retryInMs: delay },
        'Database connection failed, retrying...'
      );
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Gracefully close all database connections.
 */
export async function closeDatabase(): Promise<void> {
  dbLogger.info('Closing database connection pool...');
  await pool.end();
  dbLogger.info('Database connection pool closed');
}
