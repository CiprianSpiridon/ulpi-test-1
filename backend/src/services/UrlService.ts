/**
 * URL shortening service.
 *
 * Handles all business logic for URL CRUD operations:
 * - Short code generation with collision detection
 * - URL creation with user quota enforcement
 * - Redis caching for hot-path redirect lookups
 * - Ownership verification for mutations
 */

import bcrypt from 'bcrypt';
import { env, createChildLogger, getRedisClient } from '../config';
import { urlRepository, userRepository } from '../repositories';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../errors';
import { UrlRow, PaginatedResult, UrlDTO } from '../types';
import { generateShortCode, toUrlDTO } from '../utils';

const log = createChildLogger({ module: 'UrlService' });

/** Redis cache key prefix for URL lookups */
const URL_CACHE_PREFIX = 'url:lookup:';

/** Cache TTL for URL lookups in seconds */
const URL_CACHE_TTL = 300; // 5 minutes

export class UrlService {
  /**
   * Create a new shortened URL.
   *
   * - Validates user has not exceeded max_urls quota
   * - Generates unique short code with collision retry
   * - Optionally sets custom slug, password, expiration
   */
  async createUrl(data: {
    userId: string;
    originalUrl: string;
    customSlug?: string;
    title?: string;
    description?: string;
    maxClicks?: number;
    password?: string;
    expiresAt?: Date;
  }): Promise<UrlDTO> {
    // Check user URL quota
    const user = await userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const urlCount = await userRepository.countUserUrls(data.userId);
    if (urlCount >= user.max_urls) {
      throw new BadRequestError(
        `URL limit reached. You can create a maximum of ${user.max_urls} URLs.`
      );
    }

    // Validate custom slug uniqueness if provided
    if (data.customSlug) {
      const slugExists = await urlRepository.shortCodeExists(data.customSlug);
      if (slugExists) {
        throw new ConflictError(`The slug "${data.customSlug}" is already taken`);
      }
    }

    // Generate unique short code with collision retry (max 10 attempts)
    let shortCode = generateShortCode();
    let attempts = 0;
    while (await urlRepository.shortCodeExists(shortCode)) {
      attempts++;
      if (attempts >= 10) {
        throw new BadRequestError(
          'Unable to generate a unique short code. Please try again.'
        );
      }
      shortCode = generateShortCode();
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, env.bcryptSaltRounds);
    }

    // Create the URL record
    const url = await urlRepository.create({
      userId: data.userId,
      originalUrl: data.originalUrl,
      shortCode,
      customSlug: data.customSlug,
      title: data.title,
      description: data.description,
      maxClicks: data.maxClicks,
      passwordHash,
      expiresAt: data.expiresAt,
    });

    log.info(
      { urlId: url.id, shortCode: url.short_code, userId: data.userId },
      'URL created'
    );

    return toUrlDTO(url);
  }

  /**
   * Get a single URL by ID.
   * Verifies ownership for non-admin users.
   */
  async getUrl(urlId: string, userId: string, userRole: string): Promise<UrlDTO> {
    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw new NotFoundError('URL');
    }

    // Only the owner or admins can view URL details
    if (url.user_id !== userId && userRole === 'user') {
      throw new ForbiddenError('You do not have permission to view this URL');
    }

    return toUrlDTO(url);
  }

  /**
   * List URLs for the authenticated user with pagination.
   */
  async listUrls(
    userId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      search?: string;
    }
  ): Promise<PaginatedResult<UrlDTO>> {
    const result = await urlRepository.findByUserId(userId, options);

    return {
      data: result.data.map(toUrlDTO),
      pagination: result.pagination,
    };
  }

  /**
   * Update an existing URL.
   * Verifies ownership before mutation.
   */
  async updateUrl(
    urlId: string,
    userId: string,
    userRole: string,
    data: {
      originalUrl?: string;
      customSlug?: string | null;
      title?: string | null;
      description?: string | null;
      status?: string;
      maxClicks?: number | null;
      expiresAt?: Date | null;
    }
  ): Promise<UrlDTO> {
    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw new NotFoundError('URL');
    }

    if (url.user_id !== userId && userRole === 'user') {
      throw new ForbiddenError('You do not have permission to update this URL');
    }

    // Check custom slug uniqueness if changing
    if (
      data.customSlug !== undefined &&
      data.customSlug !== null &&
      data.customSlug !== url.custom_slug
    ) {
      const slugExists = await urlRepository.shortCodeExists(data.customSlug);
      if (slugExists) {
        throw new ConflictError(`The slug "${data.customSlug}" is already taken`);
      }
    }

    const updated = await urlRepository.update(urlId, data);
    if (!updated) {
      throw new NotFoundError('URL');
    }

    // Invalidate cache for this URL's short code / slug
    await this.invalidateUrlCache(url.short_code);
    if (url.custom_slug) {
      await this.invalidateUrlCache(url.custom_slug);
    }

    log.info({ urlId, userId }, 'URL updated');

    return toUrlDTO(updated);
  }

  /**
   * Soft-delete a URL (sets status to 'disabled').
   */
  async deleteUrl(urlId: string, userId: string, userRole: string): Promise<void> {
    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw new NotFoundError('URL');
    }

    if (url.user_id !== userId && userRole === 'user') {
      throw new ForbiddenError('You do not have permission to delete this URL');
    }

    await urlRepository.delete(urlId);

    // Invalidate cache
    await this.invalidateUrlCache(url.short_code);
    if (url.custom_slug) {
      await this.invalidateUrlCache(url.custom_slug);
    }

    log.info({ urlId, userId }, 'URL deleted');
  }

  /**
   * Resolve a short code to the original URL for redirect.
   * This is the HOT PATH - uses Redis caching for performance.
   *
   * Returns null if URL not found, expired, or max clicks exceeded.
   */
  async resolveShortCode(shortCode: string): Promise<UrlRow | null> {
    // Try Redis cache first
    try {
      const redis = getRedisClient();
      const cached = await redis.get(URL_CACHE_PREFIX + shortCode);
      if (cached) {
        const url = JSON.parse(cached) as UrlRow;
        // Re-check expiration and max clicks against cached data
        if (this.isUrlValid(url)) {
          return url;
        }
        // Cached data is stale (expired or max clicks reached) - remove it
        await redis.del(URL_CACHE_PREFIX + shortCode);
      }
    } catch (err) {
      // Redis failure should not break redirects - fall through to database
      log.warn({ err, shortCode }, 'Redis cache read failed, falling back to database');
    }

    // Cache miss - query database
    const url = await urlRepository.findByShortCode(shortCode);
    if (!url || !this.isUrlValid(url)) {
      return null;
    }

    // Store in cache for future lookups
    try {
      const redis = getRedisClient();
      await redis.setEx(
        URL_CACHE_PREFIX + shortCode,
        URL_CACHE_TTL,
        JSON.stringify(url)
      );
    } catch (err) {
      log.warn({ err, shortCode }, 'Redis cache write failed');
    }

    return url;
  }

  /**
   * Check if a URL is still valid (not expired, not max-clicks exceeded).
   */
  private isUrlValid(url: UrlRow): boolean {
    if (url.status !== 'active') return false;
    if (url.expires_at && new Date(url.expires_at) < new Date()) return false;
    if (url.max_clicks !== null && Number(url.clicks) >= Number(url.max_clicks)) return false;
    return true;
  }

  /**
   * Invalidate Redis cache for a short code.
   */
  private async invalidateUrlCache(shortCode: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(URL_CACHE_PREFIX + shortCode);
    } catch (err) {
      log.warn({ err, shortCode }, 'Redis cache invalidation failed');
    }
  }
}

export const urlService = new UrlService();
