/**
 * Analytics service.
 *
 * Handles click tracking and analytics aggregation:
 * - Parses User-Agent for device, browser, OS detection
 * - Records click events asynchronously (non-blocking for redirect)
 * - Provides summary and detailed analytics endpoints
 * - Dashboard stats aggregation for authenticated users
 */

import UAParser from 'ua-parser-js';
import { createChildLogger } from '../config';
import { analyticsRepository, urlRepository } from '../repositories';
import { NotFoundError, ForbiddenError } from '../errors';
import { AnalyticsSummaryDTO, DashboardStatsDTO } from '../types';

const log = createChildLogger({ module: 'AnalyticsService' });

export class AnalyticsService {
  /**
   * Record a click event for a URL redirect.
   *
   * This method is called asynchronously after the redirect response
   * is sent to avoid blocking the user. Failures are logged but do not
   * affect the redirect.
   *
   * Parses User-Agent to extract device type, browser, and OS.
   */
  async recordClick(data: {
    urlId: string;
    ipAddress: string | null;
    userAgent: string | null;
    referer: string | null;
  }): Promise<void> {
    try {
      // Parse User-Agent for device/browser/OS detection
      const parsed = data.userAgent ? new UAParser(data.userAgent).getResult() : null;

      const deviceType = this.detectDeviceType(parsed);
      const browser = parsed?.browser?.name ?? null;
      const os = parsed?.os?.name ?? null;

      // Record the click in analytics table
      await analyticsRepository.recordClick({
        urlId: data.urlId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referer: data.referer,
        country: null, // Geo-IP lookup would go here (omitted for now)
        city: null,
        deviceType,
        browser,
        os,
      });

      // Increment the click counter on the URL record
      await urlRepository.incrementClicks(data.urlId);

      log.debug({ urlId: data.urlId }, 'Click recorded');
    } catch (err) {
      // Analytics failures must never break redirects
      log.error({ err, urlId: data.urlId }, 'Failed to record click analytics');
    }
  }

  /**
   * Get detailed analytics for a specific URL.
   * Verifies the requesting user owns the URL (or is admin).
   */
  async getUrlAnalytics(
    urlId: string,
    userId: string,
    userRole: string,
    options?: { periodStart?: Date; periodEnd?: Date; days?: number }
  ): Promise<{
    summary: AnalyticsSummaryDTO;
    clicksByDay: Array<{ date: string; clicks: number }>;
    clicksByCountry: Array<{ country: string; clicks: number }>;
    clicksByBrowser: Array<{ browser: string; clicks: number }>;
    clicksByDevice: Array<{ deviceType: string; clicks: number }>;
    clicksByReferrer: Array<{ referer: string; clicks: number }>;
  }> {
    // Verify URL exists and user has access
    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw new NotFoundError('URL');
    }

    if (url.user_id !== userId && userRole === 'user') {
      throw new ForbiddenError('You do not have permission to view analytics for this URL');
    }

    const days = options?.days ?? 30;

    // Run analytics queries in parallel for performance
    const [summary, clicksByDay, clicksByCountry, clicksByBrowser, clicksByDevice, clicksByReferrer] =
      await Promise.all([
        analyticsRepository.getSummary(urlId, options?.periodStart, options?.periodEnd),
        analyticsRepository.getClicksByDay(urlId, days),
        analyticsRepository.getClicksByCountry(urlId),
        analyticsRepository.getClicksByBrowser(urlId),
        analyticsRepository.getClicksByDevice(urlId),
        analyticsRepository.getClicksByReferrer(urlId),
      ]);

    return {
      summary,
      clicksByDay,
      clicksByCountry,
      clicksByBrowser,
      clicksByDevice,
      clicksByReferrer,
    };
  }

  /**
   * Get dashboard statistics for the authenticated user.
   * Aggregates data across all of the user's URLs.
   */
  async getDashboardStats(
    userId: string,
    days: number = 30
  ): Promise<DashboardStatsDTO> {
    // Run queries in parallel
    const [urlCounts, totalClicks, topUrls, clicksByDay] = await Promise.all([
      urlRepository.countByStatus(userId),
      analyticsRepository.getUserTotalClicks(userId),
      urlRepository.getTopUrls(userId, 5),
      analyticsRepository.getUserClicksByDay(userId, days),
    ]);

    return {
      totalUrls: urlCounts.total,
      totalClicks,
      activeUrls: urlCounts.active,
      topUrls: topUrls.map((u) => ({
        id: u.id,
        shortCode: u.short_code,
        originalUrl: u.original_url,
        clicks: Number(u.clicks),
      })),
      clicksByDay,
    };
  }

  /**
   * Detect device type from parsed User-Agent.
   */
  private detectDeviceType(parsed: UAParser.IResult | null): string | null {
    if (!parsed) return null;

    const deviceType = parsed.device?.type;
    if (deviceType === 'mobile') return 'mobile';
    if (deviceType === 'tablet') return 'tablet';

    // Check if it looks like a bot
    const ua = parsed.ua?.toLowerCase() ?? '';
    if (
      ua.includes('bot') ||
      ua.includes('crawler') ||
      ua.includes('spider') ||
      ua.includes('curl') ||
      ua.includes('wget')
    ) {
      return 'bot';
    }

    return 'desktop';
  }
}

export const analyticsService = new AnalyticsService();
