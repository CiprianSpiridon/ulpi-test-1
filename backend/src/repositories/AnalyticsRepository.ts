/**
 * Analytics repository - data access layer for the analytics table.
 *
 * Handles click tracking data storage and analytics aggregation queries.
 * All queries use parameterized values to prevent SQL injection.
 */

import { query } from '../config/database';
import { AnalyticsSummaryDTO, ClicksByDayRow } from '../types';

export class AnalyticsRepository {
  /**
   * Record a click event for analytics.
   * Called asynchronously during redirect to avoid blocking the response.
   */
  async recordClick(data: {
    urlId: string;
    ipAddress: string | null;
    userAgent: string | null;
    referer: string | null;
    country: string | null;
    city: string | null;
    deviceType: string | null;
    browser: string | null;
    os: string | null;
  }): Promise<void> {
    await query(
      `INSERT INTO analytics (
        url_id, ip_address, user_agent, referer,
        country, city, device_type, browser, os
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.urlId,
        data.ipAddress,
        data.userAgent,
        data.referer,
        data.country,
        data.city,
        data.deviceType,
        data.browser,
        data.os,
      ]
    );
  }

  /**
   * Get analytics summary for a URL using the database function.
   */
  async getSummary(
    urlId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<AnalyticsSummaryDTO> {
    const start = periodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = periodEnd ?? new Date();

    const result = await query<{
      total_clicks: string;
      unique_visitors: string;
      top_country: string | null;
      top_referer: string | null;
      top_browser: string | null;
      top_device: string | null;
    }>(
      'SELECT * FROM get_url_analytics_summary($1, $2, $3)',
      [urlId, start, end]
    );

    const row = result.rows[0];
    return {
      totalClicks: parseInt(row?.total_clicks ?? '0', 10),
      uniqueVisitors: parseInt(row?.unique_visitors ?? '0', 10),
      topCountry: row?.top_country ?? null,
      topReferer: row?.top_referer ?? null,
      topBrowser: row?.top_browser ?? null,
      topDevice: row?.top_device ?? null,
    };
  }

  /**
   * Get click counts aggregated by day for a URL.
   */
  async getClicksByDay(
    urlId: string,
    days: number = 30
  ): Promise<Array<{ date: string; clicks: number }>> {
    const result = await query<ClicksByDayRow>(
      `SELECT
        DATE(clicked_at) AS date,
        COUNT(*)::text AS clicks
       FROM analytics
       WHERE url_id = $1
         AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY DATE(clicked_at)
       ORDER BY date ASC`,
      [urlId, days.toString()]
    );

    return result.rows.map((row) => ({
      date: row.date,
      clicks: parseInt(row.clicks, 10),
    }));
  }

  /**
   * Get click counts by country for a URL.
   */
  async getClicksByCountry(
    urlId: string,
    limit: number = 10
  ): Promise<Array<{ country: string; clicks: number }>> {
    const result = await query<{ country: string; clicks: string }>(
      `SELECT
        COALESCE(country, 'Unknown') AS country,
        COUNT(*)::text AS clicks
       FROM analytics
       WHERE url_id = $1
       GROUP BY country
       ORDER BY clicks DESC
       LIMIT $2`,
      [urlId, limit]
    );

    return result.rows.map((row) => ({
      country: row.country,
      clicks: parseInt(row.clicks, 10),
    }));
  }

  /**
   * Get click counts by browser for a URL.
   */
  async getClicksByBrowser(
    urlId: string,
    limit: number = 10
  ): Promise<Array<{ browser: string; clicks: number }>> {
    const result = await query<{ browser: string; clicks: string }>(
      `SELECT
        COALESCE(browser, 'Unknown') AS browser,
        COUNT(*)::text AS clicks
       FROM analytics
       WHERE url_id = $1
       GROUP BY browser
       ORDER BY clicks DESC
       LIMIT $2`,
      [urlId, limit]
    );

    return result.rows.map((row) => ({
      browser: row.browser,
      clicks: parseInt(row.clicks, 10),
    }));
  }

  /**
   * Get click counts by device type for a URL.
   */
  async getClicksByDevice(
    urlId: string
  ): Promise<Array<{ deviceType: string; clicks: number }>> {
    const result = await query<{ device_type: string; clicks: string }>(
      `SELECT
        COALESCE(device_type, 'Unknown') AS device_type,
        COUNT(*)::text AS clicks
       FROM analytics
       WHERE url_id = $1
       GROUP BY device_type
       ORDER BY clicks DESC`,
      [urlId]
    );

    return result.rows.map((row) => ({
      deviceType: row.device_type,
      clicks: parseInt(row.clicks, 10),
    }));
  }

  /**
   * Get click counts by referrer for a URL.
   */
  async getClicksByReferrer(
    urlId: string,
    limit: number = 10
  ): Promise<Array<{ referer: string; clicks: number }>> {
    const result = await query<{ referer: string; clicks: string }>(
      `SELECT
        COALESCE(referer, 'Direct') AS referer,
        COUNT(*)::text AS clicks
       FROM analytics
       WHERE url_id = $1
       GROUP BY referer
       ORDER BY clicks DESC
       LIMIT $2`,
      [urlId, limit]
    );

    return result.rows.map((row) => ({
      referer: row.referer,
      clicks: parseInt(row.clicks, 10),
    }));
  }

  /**
   * Get total clicks across all URLs for a user, aggregated by day.
   */
  async getUserClicksByDay(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; clicks: number }>> {
    const result = await query<ClicksByDayRow>(
      `SELECT
        DATE(a.clicked_at) AS date,
        COUNT(*)::text AS clicks
       FROM analytics a
       JOIN urls u ON a.url_id = u.id
       WHERE u.user_id = $1
         AND a.clicked_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY DATE(a.clicked_at)
       ORDER BY date ASC`,
      [userId, days.toString()]
    );

    return result.rows.map((row) => ({
      date: row.date,
      clicks: parseInt(row.clicks, 10),
    }));
  }

  /**
   * Get total clicks across all URLs for a user.
   */
  async getUserTotalClicks(userId: string): Promise<number> {
    const result = await query<{ total: string }>(
      `SELECT COALESCE(SUM(clicks), 0)::text AS total
       FROM urls
       WHERE user_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].total, 10);
  }
}

export const analyticsRepository = new AnalyticsRepository();
