/**
 * Redirect route - the HOT PATH for the URL shortener.
 *
 * GET /:shortCode  - Resolve short code and redirect to original URL
 *
 * Performance optimizations:
 * - Redis caching for URL lookups
 * - Analytics recording is async (non-blocking)
 * - Minimal middleware stack on this route
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils';
import { validate, redirectRateLimiter } from '../middleware';
import { urlService, analyticsService } from '../services';
import { shortCodeParamSchema } from './validations';
import { NotFoundError } from '../errors';

const router = Router();

/**
 * GET /:shortCode
 *
 * Resolve a short code (or custom slug) and perform a 302 redirect
 * to the original URL.
 *
 * - Returns 302 redirect on success
 * - Returns 404 if short code not found, expired, or disabled
 * - Records analytics asynchronously after sending the redirect response
 *
 * Response 302: Redirect to original URL
 * Response 404: Short URL not found
 */
router.get(
  '/:shortCode',
  redirectRateLimiter,
  validate(shortCodeParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const { shortCode } = req.params;

    // Resolve the short code to the original URL
    const url = await urlService.resolveShortCode(shortCode);

    if (!url) {
      throw new NotFoundError('Short URL');
    }

    // Send redirect immediately (do not wait for analytics)
    res.redirect(302, url.original_url);

    // Record analytics asynchronously after response is sent
    // Using void to explicitly mark fire-and-forget
    void analyticsService.recordClick({
      urlId: url.id,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      referer: (typeof req.headers.referer === 'string' ? req.headers.referer : null),
    });
  })
);

export default router;
