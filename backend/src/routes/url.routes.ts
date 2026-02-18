/**
 * URL management routes.
 *
 * POST   /api/v1/urls      - Create a new short URL
 * GET    /api/v1/urls      - List user's URLs with pagination
 * GET    /api/v1/urls/:id  - Get URL details
 * PUT    /api/v1/urls/:id  - Update a URL
 * DELETE /api/v1/urls/:id  - Delete (soft-delete) a URL
 *
 * All routes require authentication.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils';
import { authenticate, validate, urlCreationRateLimiter } from '../middleware';
import { urlService } from '../services';
import {
  createUrlSchema,
  updateUrlSchema,
  listUrlsQuerySchema,
  urlIdParamSchema,
} from './validations';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * POST /api/v1/urls
 *
 * Create a new shortened URL.
 *
 * Request body:
 *   - originalUrl (string, required): The URL to shorten (must start with http/https)
 *   - customSlug (string, optional): Custom slug (3-50 chars, alphanumeric + hyphens)
 *   - title (string, optional): Descriptive title
 *   - description (string, optional): Description
 *   - maxClicks (number, optional): Max number of clicks before deactivation
 *   - password (string, optional): Password-protect the URL
 *   - expiresAt (date, optional): Expiration date (ISO 8601)
 *
 * Response 201:
 *   - UrlDTO with shortUrl
 */
router.post(
  '/',
  authenticate,
  urlCreationRateLimiter,
  validate(createUrlSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const url = await urlService.createUrl({
      userId: authReq.user.id,
      ...req.body,
    });
    res.status(201).json({ status: 'success', data: url });
  })
);

/**
 * GET /api/v1/urls
 *
 * List the authenticated user's URLs with pagination.
 *
 * Query parameters:
 *   - page (number, default 1): Page number
 *   - limit (number, default 20, max 100): Items per page
 *   - status (string, optional): Filter by status (active, disabled, expired)
 *   - search (string, optional): Search in URL, title, or short code
 *
 * Response 200:
 *   - data: UrlDTO[]
 *   - pagination: { page, limit, total, totalPages }
 */
router.get(
  '/',
  authenticate,
  validate(listUrlsQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const result = await urlService.listUrls(authReq.user.id, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.status(200).json({ status: 'success', ...result });
  })
);

/**
 * GET /api/v1/urls/:id
 *
 * Get details of a specific URL by its UUID.
 *
 * Response 200:
 *   - UrlDTO
 */
router.get(
  '/:id',
  authenticate,
  validate(urlIdParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const url = await urlService.getUrl(
      req.params.id,
      authReq.user.id,
      authReq.user.role
    );
    res.status(200).json({ status: 'success', data: url });
  })
);

/**
 * PUT /api/v1/urls/:id
 *
 * Update an existing URL.
 *
 * Request body (at least one field required):
 *   - originalUrl (string, optional)
 *   - customSlug (string | null, optional)
 *   - title (string | null, optional)
 *   - description (string | null, optional)
 *   - status ('active' | 'disabled', optional)
 *   - maxClicks (number | null, optional)
 *   - expiresAt (date | null, optional)
 *
 * Response 200:
 *   - Updated UrlDTO
 */
router.put(
  '/:id',
  authenticate,
  validate(urlIdParamSchema, 'params'),
  validate(updateUrlSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const url = await urlService.updateUrl(
      req.params.id,
      authReq.user.id,
      authReq.user.role,
      req.body
    );
    res.status(200).json({ status: 'success', data: url });
  })
);

/**
 * DELETE /api/v1/urls/:id
 *
 * Soft-delete a URL (sets status to 'disabled').
 *
 * Response 204: No content
 */
router.delete(
  '/:id',
  authenticate,
  validate(urlIdParamSchema, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await urlService.deleteUrl(
      req.params.id,
      authReq.user.id,
      authReq.user.role
    );
    res.status(204).send();
  })
);

export default router;
