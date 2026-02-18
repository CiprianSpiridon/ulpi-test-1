const express = require('express');
const urlService = require('../services/urlService');
const { validateShortenRequest, validateShortCode } = require('../utils/validator');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/shorten
 * Create a shortened URL
 */
router.post('/shorten', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = validateShortenRequest(req.body);
  if (error) {
    return res.status(400).json({
      error: error.details[0].message
    });
  }

  const { url, customCode } = value;

  try {
    const result = await urlService.createShortUrl(url, customCode);

    // Add full URL to response
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    result.full_short_url = `${baseUrl}${result.short_url}`;

    res.status(result.exists ? 200 : 201).json({
      success: true,
      data: result,
      message: result.exists ? 'URL already exists' : 'Short URL created successfully'
    });
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
}));

/**
 * GET /api/stats/:shortCode
 * Get statistics for a shortened URL
 */
router.get('/stats/:shortCode', asyncHandler(async (req, res) => {
  // Validate short code parameter
  const { error, value } = validateShortCode(req.params);
  if (error) {
    return res.status(400).json({
      error: error.details[0].message
    });
  }

  const { shortCode } = value;

  const stats = await urlService.getUrlStats(shortCode);
  if (!stats) {
    return res.status(404).json({
      error: 'Short URL not found'
    });
  }

  // Add full URL to response
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  stats.full_short_url = `${baseUrl}${stats.short_url}`;

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/urls
 * Get all URLs with pagination
 */
router.get('/urls', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 items per page
  const offset = (page - 1) * limit;

  const [urls, totalCount] = await Promise.all([
    urlService.getAllUrls(limit, offset),
    urlService.getTotalCount()
  ]);

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const urlsWithFullUrls = urls.map(url => ({
    ...url,
    full_short_url: `${baseUrl}${url.short_url}`
  }));

  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: urlsWithFullUrls,
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_count: totalCount,
      limit,
      has_next: page < totalPages,
      has_prev: page > 1
    }
  });
}));

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'URL Shortener API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;