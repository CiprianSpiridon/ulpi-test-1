/**
 * Joi validation schemas for all API endpoints.
 *
 * Config-driven validation rules:
 * - Password: min 8 chars, requires upper, lower, digit
 * - Email: standard email format
 * - Short codes: alphanumeric + hyphens/underscores, 3-50 chars
 * - URLs: must start with http:// or https://
 * - Pagination: page >= 1, limit 1-100
 */

import Joi from 'joi';

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
      'any.required': 'Password is required',
    }),

  displayName: Joi.string()
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.max': 'Display name must be 100 characters or fewer',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

// ---------------------------------------------------------------------------
// URL schemas
// ---------------------------------------------------------------------------

export const createUrlSchema = Joi.object({
  originalUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .required()
    .messages({
      'string.uri': 'Please provide a valid URL starting with http:// or https://',
      'string.max': 'URL must be 2048 characters or fewer',
      'any.required': 'Original URL is required',
    }),

  customSlug: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(3)
    .max(50)
    .optional()
    .messages({
      'string.pattern.base': 'Custom slug can only contain letters, numbers, hyphens, and underscores',
      'string.min': 'Custom slug must be at least 3 characters',
      'string.max': 'Custom slug must be 50 characters or fewer',
    }),

  title: Joi.string()
    .max(255)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'Title must be 255 characters or fewer',
    }),

  description: Joi.string()
    .max(1000)
    .trim()
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be 1000 characters or fewer',
    }),

  maxClicks: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': 'Max clicks must be at least 1',
    }),

  password: Joi.string()
    .min(1)
    .max(128)
    .optional()
    .messages({
      'string.min': 'Password must not be empty',
    }),

  expiresAt: Joi.date()
    .iso()
    .greater('now')
    .optional()
    .messages({
      'date.greater': 'Expiration date must be in the future',
    }),
});

export const updateUrlSchema = Joi.object({
  originalUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .optional()
    .messages({
      'string.uri': 'Please provide a valid URL starting with http:// or https://',
    }),

  customSlug: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(3)
    .max(50)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Custom slug can only contain letters, numbers, hyphens, and underscores',
    }),

  title: Joi.string()
    .max(255)
    .trim()
    .optional()
    .allow(null, ''),

  description: Joi.string()
    .max(1000)
    .trim()
    .optional()
    .allow(null, ''),

  status: Joi.string()
    .valid('active', 'disabled')
    .optional(),

  maxClicks: Joi.number()
    .integer()
    .min(1)
    .optional()
    .allow(null),

  expiresAt: Joi.date()
    .iso()
    .optional()
    .allow(null),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// ---------------------------------------------------------------------------
// Query parameter schemas
// ---------------------------------------------------------------------------

export const listUrlsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  status: Joi.string()
    .valid('active', 'disabled', 'expired')
    .optional(),

  search: Joi.string()
    .max(255)
    .trim()
    .optional(),
});

export const analyticsQuerySchema = Joi.object({
  periodStart: Joi.date()
    .iso()
    .optional(),

  periodEnd: Joi.date()
    .iso()
    .optional(),

  days: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30),
});

export const dashboardQuerySchema = Joi.object({
  days: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30),
});

// ---------------------------------------------------------------------------
// Param schemas
// ---------------------------------------------------------------------------

export const urlIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid URL ID format',
    }),
});

export const shortCodeParamSchema = Joi.object({
  shortCode: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.pattern.base': 'Invalid short code format',
    }),
});
