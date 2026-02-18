const Joi = require('joi');

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Joi schema for URL shortening request
 */
const shortenUrlSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2000)
    .required()
    .messages({
      'string.uri': 'Please provide a valid HTTP or HTTPS URL',
      'string.max': 'URL must be less than 2000 characters',
      'any.required': 'URL is required'
    }),
  customCode: Joi.string()
    .pattern(/^[a-zA-Z0-9]{4,10}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Custom code must be 4-10 characters and contain only letters and numbers'
    })
});

/**
 * Joi schema for short code parameter
 */
const shortCodeSchema = Joi.object({
  shortCode: Joi.string()
    .pattern(/^[a-zA-Z0-9]{4,10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Short code must be 4-10 characters and contain only letters and numbers',
      'any.required': 'Short code is required'
    })
});

/**
 * Validate URL shortening request
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateShortenRequest(data) {
  return shortenUrlSchema.validate(data);
}

/**
 * Validate short code parameter
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateShortCode(data) {
  return shortCodeSchema.validate(data);
}

/**
 * Normalize URL (add protocol if missing, remove trailing slash, etc.)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  let normalized = url.trim();

  // Add protocol if missing
  if (!normalized.match(/^https?:\/\//)) {
    normalized = 'https://' + normalized;
  }

  try {
    const urlObj = new URL(normalized);

    // Remove trailing slash for consistency (except for root path)
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    return urlObj.toString();
  } catch (error) {
    return normalized; // Return original if parsing fails
  }
}

/**
 * Check if URL is safe (basic safety checks)
 * @param {string} url - URL to check
 * @returns {Object} Safety check result
 */
function checkUrlSafety(url) {
  const result = {
    safe: true,
    reason: null
  };

  try {
    const urlObj = new URL(url);

    // Block localhost and internal network addresses
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      result.safe = false;
      result.reason = 'Internal network addresses are not allowed';
    }

    // Block some malicious patterns
    const maliciousPatterns = [
      'javascript:',
      'data:',
      'file:',
      'ftp:'
    ];

    if (maliciousPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
      result.safe = false;
      result.reason = 'Potentially unsafe URL scheme detected';
    }

  } catch (error) {
    result.safe = false;
    result.reason = 'Invalid URL format';
  }

  return result;
}

module.exports = {
  isValidUrl,
  validateShortenRequest,
  validateShortCode,
  normalizeUrl,
  checkUrlSafety
};