/**
 * URL repository - data access layer for the urls table.
 *
 * All database queries for URLs are encapsulated here.
 * Uses parameterized queries exclusively to prevent SQL injection.
 */

import { query } from '../config/database';
import { UrlRow, PaginatedResult } from '../types';
import { createChildLogger } from '../config/logger';

const log = createChildLogger({ module: 'UrlRepository' });

export class UrlRepository {
  /**
   * Find a URL by its UUID primary key.
   */
  async findById(id: string): Promise<UrlRow | null> {
    const result = await query<UrlRow>(
      'SELECT * FROM urls WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Find an active URL by its short code or custom slug.
   * This is the HOT PATH for redirect lookups - optimized with partial index.
   */
  async findByShortCode(shortCode: string): Promise<UrlRow | null> {
    const result = await query<UrlRow>(
      `SELECT * FROM urls
       WHERE (short_code = $1 OR custom_slug = $1)
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [shortCode]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Check if a short code or custom slug already exists.
   */
  async shortCodeExists(shortCode: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM urls WHERE short_code = $1 OR custom_slug = $1
      ) AS exists`,
      [shortCode]
    );
    return result.rows[0].exists;
  }

  /**
   * Create a new shortened URL.
   */
  async create(data: {
    userId: string | null;
    originalUrl: string;
    shortCode: string;
    customSlug?: string;
    title?: string;
    description?: string;
    maxClicks?: number;
    passwordHash?: string;
    expiresAt?: Date;
  }): Promise<UrlRow> {
    const result = await query<UrlRow>(
      `INSERT INTO urls (
        user_id, original_url, short_code, custom_slug,
        title, description, max_clicks, password_hash, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.userId,
        data.originalUrl,
        data.shortCode,
        data.customSlug ?? null,
        data.title ?? null,
        data.description ?? null,
        data.maxClicks ?? null,
        data.passwordHash ?? null,
        data.expiresAt ?? null,
      ]
    );

    log.info(
      { urlId: result.rows[0].id, shortCode: data.shortCode },
      'URL created'
    );
    return result.rows[0];
  }

  /**
   * Update an existing URL.
   * Only the owner can update their URLs (enforced in service layer).
   */
  async update(
    id: string,
    data: {
      originalUrl?: string;
      customSlug?: string | null;
      title?: string | null;
      description?: string | null;
      status?: string;
      maxClicks?: number | null;
      expiresAt?: Date | null;
    }
  ): Promise<UrlRow | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.originalUrl !== undefined) {
      setClauses.push(`original_url = $${paramIndex++}`);
      values.push(data.originalUrl);
    }
    if (data.customSlug !== undefined) {
      setClauses.push(`custom_slug = $${paramIndex++}`);
      values.push(data.customSlug);
    }
    if (data.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.maxClicks !== undefined) {
      setClauses.push(`max_clicks = $${paramIndex++}`);
      values.push(data.maxClicks);
    }
    if (data.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`);
      values.push(data.expiresAt);
    }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<UrlRow>(
      `UPDATE urls SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] ?? null;
  }

  /**
   * Soft-delete a URL by setting status to 'disabled'.
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      "UPDATE urls SET status = 'disabled' WHERE id = $1",
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * List URLs for a user with pagination and optional search.
   */
  async findByUserId(
    userId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
    }
  ): Promise<PaginatedResult<UrlRow>> {
    const { page, limit, status, search } = options;
    const offset = (page - 1) * limit;
    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(
        `(original_url ILIKE $${paramIndex} OR title ILIKE $${paramIndex} OR short_code ILIKE $${paramIndex})`
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM urls WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const dataValues = [...values, limit, offset];
    const dataResult = await query<UrlRow>(
      `SELECT * FROM urls
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataValues
    );

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Increment click count and update last_clicked_at.
   * Uses the database function for atomicity.
   */
  async incrementClicks(urlId: string): Promise<void> {
    await query('SELECT increment_url_clicks($1)', [urlId]);
  }

  /**
   * Get top URLs by clicks for a user.
   */
  async getTopUrls(
    userId: string,
    limit: number = 10
  ): Promise<Array<{ id: string; short_code: string; original_url: string; clicks: number }>> {
    const result = await query<{
      id: string;
      short_code: string;
      original_url: string;
      clicks: number;
    }>(
      `SELECT id, short_code, original_url, clicks
       FROM urls
       WHERE user_id = $1 AND status = 'active'
       ORDER BY clicks DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Count URLs by status for a user.
   */
  async countByStatus(
    userId: string
  ): Promise<{ total: number; active: number }> {
    const result = await query<{ total: string; active: string }>(
      `SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'active')::text AS active
       FROM urls
       WHERE user_id = $1`,
      [userId]
    );
    return {
      total: parseInt(result.rows[0].total, 10),
      active: parseInt(result.rows[0].active, 10),
    };
  }
}

export const urlRepository = new UrlRepository();
