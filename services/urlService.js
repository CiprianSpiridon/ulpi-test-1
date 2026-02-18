const { getDatabase } = require('../database/db');
const { generateUniqueShortCode, isValidShortCode } = require('../utils/shortCodeGenerator');
const { normalizeUrl, checkUrlSafety } = require('../utils/validator');

/**
 * Create a shortened URL
 * @param {string} originalUrl - The original URL to shorten
 * @param {string|null} customCode - Optional custom short code
 * @returns {Promise<Object>} Created URL data
 */
async function createShortUrl(originalUrl, customCode = null) {
  const db = getDatabase();

  // Normalize the URL
  const normalizedUrl = normalizeUrl(originalUrl);

  // Check URL safety
  const safetyCheck = checkUrlSafety(normalizedUrl);
  if (!safetyCheck.safe) {
    throw new Error(safetyCheck.reason);
  }

  // Check if URL already exists
  const existingUrl = await findByOriginalUrl(normalizedUrl);
  if (existingUrl) {
    return {
      id: existingUrl.id,
      original_url: existingUrl.original_url,
      short_code: existingUrl.short_code,
      created_at: existingUrl.created_at,
      click_count: existingUrl.click_count,
      short_url: `/${existingUrl.short_code}`,
      exists: true
    };
  }

  let shortCode;

  if (customCode) {
    // Validate custom code format
    if (!isValidShortCode(customCode)) {
      throw new Error('Invalid custom code format. Must be 4-10 characters containing only letters and numbers.');
    }

    // Check if custom code is available
    const exists = await findByShortCode(customCode);
    if (exists) {
      throw new Error('Custom short code is already in use. Please choose a different one.');
    }

    shortCode = customCode;
  } else {
    // Generate unique short code
    shortCode = await generateUniqueShortCode(async (code) => {
      const exists = await findByShortCode(code);
      return !!exists;
    });
  }

  // Insert into database
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO urls (original_url, short_code)
      VALUES (?, ?)
    `;

    db.run(sql, [normalizedUrl, shortCode], function(err) {
      if (err) {
        reject(new Error('Failed to create short URL: ' + err.message));
      } else {
        // Return the created URL data
        resolve({
          id: this.lastID,
          original_url: normalizedUrl,
          short_code: shortCode,
          created_at: new Date().toISOString(),
          click_count: 0,
          short_url: `/${shortCode}`,
          exists: false
        });
      }
    });
  });
}

/**
 * Find URL by short code
 * @param {string} shortCode - The short code to look up
 * @returns {Promise<Object|null>} URL data or null if not found
 */
function findByShortCode(shortCode) {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM urls WHERE short_code = ?';

    db.get(sql, [shortCode], (err, row) => {
      if (err) {
        reject(new Error('Database query failed: ' + err.message));
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Find URL by original URL
 * @param {string} originalUrl - The original URL to look up
 * @returns {Promise<Object|null>} URL data or null if not found
 */
function findByOriginalUrl(originalUrl) {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM urls WHERE original_url = ?';

    db.get(sql, [originalUrl], (err, row) => {
      if (err) {
        reject(new Error('Database query failed: ' + err.message));
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Get original URL by short code
 * @param {string} shortCode - The short code to resolve
 * @returns {Promise<Object|null>} URL data or null if not found
 */
async function getOriginalUrl(shortCode) {
  return await findByShortCode(shortCode);
}

/**
 * Increment click count for a short code
 * @param {string} shortCode - The short code to update
 * @returns {Promise<void>}
 */
function incrementClickCount(shortCode) {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    const sql = 'UPDATE urls SET click_count = click_count + 1 WHERE short_code = ?';

    db.run(sql, [shortCode], function(err) {
      if (err) {
        reject(new Error('Failed to update click count: ' + err.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get URL statistics
 * @param {string} shortCode - The short code to get stats for
 * @returns {Promise<Object|null>} URL statistics or null if not found
 */
async function getUrlStats(shortCode) {
  const urlData = await findByShortCode(shortCode);

  if (!urlData) {
    return null;
  }

  return {
    original_url: urlData.original_url,
    short_code: urlData.short_code,
    short_url: `/${urlData.short_code}`,
    created_at: urlData.created_at,
    click_count: urlData.click_count
  };
}

/**
 * Get all URLs with pagination
 * @param {number} limit - Number of URLs to return
 * @param {number} offset - Number of URLs to skip
 * @returns {Promise<Array>} Array of URL data
 */
function getAllUrls(limit = 10, offset = 0) {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM urls
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(sql, [limit, offset], (err, rows) => {
      if (err) {
        reject(new Error('Failed to fetch URLs: ' + err.message));
      } else {
        resolve(rows.map(row => ({
          ...row,
          short_url: `/${row.short_code}`
        })));
      }
    });
  });
}

/**
 * Get total count of URLs
 * @returns {Promise<number>} Total count of URLs
 */
function getTotalCount() {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) as count FROM urls';

    db.get(sql, [], (err, row) => {
      if (err) {
        reject(new Error('Failed to get total count: ' + err.message));
      } else {
        resolve(row.count);
      }
    });
  });
}

module.exports = {
  createShortUrl,
  findByShortCode,
  findByOriginalUrl,
  getOriginalUrl,
  incrementClickCount,
  getUrlStats,
  getAllUrls,
  getTotalCount
};