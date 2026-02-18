/**
 * User repository - data access layer for the users table.
 *
 * All database queries for users are encapsulated here.
 * Uses parameterized queries exclusively to prevent SQL injection.
 */

import { query } from '../config/database';
import { UserRow } from '../types';
import { createChildLogger } from '../config/logger';

const log = createChildLogger({ module: 'UserRepository' });

export class UserRepository {
  /**
   * Find a user by their UUID primary key.
   */
  async findById(id: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND status != $2',
      [id, 'deleted']
    );
    return result.rows[0] ?? null;
  }

  /**
   * Find a user by email address (case-insensitive via CITEXT column).
   */
  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1 AND status != $2',
      [email, 'deleted']
    );
    return result.rows[0] ?? null;
  }

  /**
   * Create a new user record.
   * Returns the created user row including generated UUID and timestamps.
   */
  async create(data: {
    email: string;
    passwordHash: string;
    displayName?: string;
  }): Promise<UserRow> {
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.email, data.passwordHash, data.displayName ?? null]
    );

    log.info({ userId: result.rows[0].id, email: data.email }, 'User created');
    return result.rows[0];
  }

  /**
   * Update user's last login timestamp.
   */
  async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Update user profile fields.
   */
  async update(
    id: string,
    data: { displayName?: string; email?: string }
  ): Promise<UserRow | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.displayName !== undefined) {
      setClauses.push(`display_name = $${paramIndex++}`);
      values.push(data.displayName);
    }
    if (data.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<UserRow>(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] ?? null;
  }

  /**
   * Count total URLs created by a user.
   * Used to enforce the max_urls limit.
   */
  async countUserUrls(userId: string): Promise<number> {
    const result = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM urls WHERE user_id = $1 AND status != 'disabled'",
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Store a refresh token session record.
   */
  async createSession(data: {
    id: string;
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<void> {
    await query(
      `INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.id, data.userId, data.ipAddress, data.userAgent, data.expiresAt]
    );
  }

  /**
   * Find a session by its ID.
   */
  async findSessionById(id: string): Promise<{ id: string; user_id: string; expires_at: Date } | null> {
    const result = await query<{ id: string; user_id: string; expires_at: Date }>(
      'SELECT id, user_id, expires_at FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [id]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Delete a session (logout).
   */
  async deleteSession(id: string): Promise<void> {
    await query('DELETE FROM sessions WHERE id = $1', [id]);
  }

  /**
   * Delete all sessions for a user (logout all devices).
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }
}

export const userRepository = new UserRepository();
