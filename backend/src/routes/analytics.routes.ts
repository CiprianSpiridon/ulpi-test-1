/**
 * Analytics routes.
 *
 * GET /api/v1/analytics/urls/:id    - Detailed analytics for a specific URL
 * GET /api/v1/analytics/dashboard   - Dashboard stats for the authenticated user
 *
 * All routes require authentication.
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils';
import { authenticate, validate } from '../middleware';
import { analyticsService } from '../services';
import {
  urlIdParamSchema,
  analyticsQuerySchema,
  dashboardQuerySchema,
} from './validations';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /api/v1/analytics/urls/:id
 *
 * Get detailed analytics for a specific URL.
 *
 * Path parameters:
 *   - id (UUID, required): URL ID
 *
 * Query parameters:
 *   - periodStart (date, optional): Start of the analytics period (ISO 8601)
 *   - periodEnd (date, optional): End of the analytics period (ISO 8601)
 *   - days (number, optional, default 30): Number of days for clicksByDay
 *
 * Response 200:
 *   - summary: { totalClicks, uniqueVisitors, topCountry, topReferer, topBrowser, topDevice }
 *   - clicksByDay: [{ date, clicks }]
 *   - clicksByCountry: [{ country, clicks }]
 *   - clicksByBrowser: [{ browser, clicks }]
 *   - clicksByDevice: [{ deviceType, clicks }]
 *   - clicksByReferrer: [{ referer, clicks }]
 */
router.get(
  '/urls/:id',
  authenticate,
  validate(urlIdParamSchema, 'params'),
  validate(analyticsQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const analytics = await analyticsService.getUrlAnalytics(
      req.params.id,
      authReq.user.id,
      authReq.user.role,
      {
        periodStart: req.query.periodStart
          ? new Date(req.query.periodStart as string)
          : undefined,
        periodEnd: req.query.periodEnd
          ? new Date(req.query.periodEnd as string)
          : undefined,
        days: Number(req.query.days) || 30,
      }
    );
    res.status(200).json({ status: 'success', data: analytics });
  })
);

/**
 * GET /api/v1/analytics/dashboard
 *
 * Get dashboard statistics for the authenticated user.
 * Aggregates data across all of the user's URLs.
 *
 * Query parameters:
 *   - days (number, optional, default 30, max 365): Days of history for clicksByDay chart
 *
 * Response 200:
 *   - totalUrls: number
 *   - totalClicks: number
 *   - activeUrls: number
 *   - topUrls: [{ id, shortCode, originalUrl, clicks }]
 *   - clicksByDay: [{ date, clicks }]
 */
router.get(
  '/dashboard',
  authenticate,
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const stats = await analyticsService.getDashboardStats(
      authReq.user.id,
      Number(req.query.days) || 30
    );
    res.status(200).json({ status: 'success', data: stats });
  })
);

export default router;
