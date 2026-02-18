const crypto = require('crypto');

// Characters to use for short codes (alphanumeric, no ambiguous chars like 0, O, I, l)
const CHARACTERS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789';
const CODE_LENGTH = 6;

/**
 * Generate a random short code
 * @param {number} length - Length of the short code (default: 6)
 * @returns {string} Generated short code
 */
function generateShortCode(length = CODE_LENGTH) {
  let result = '';
  const charactersLength = CHARACTERS.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charactersLength);
    result += CHARACTERS.charAt(randomIndex);
  }

  return result;
}

/**
 * Generate a unique short code by checking against existing codes
 * @param {Function} checkExists - Function to check if code exists in database
 * @param {number} maxAttempts - Maximum attempts to generate unique code
 * @returns {Promise<string>} Unique short code
 */
async function generateUniqueShortCode(checkExists, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shortCode = generateShortCode();
    const exists = await checkExists(shortCode);

    if (!exists) {
      return shortCode;
    }
  }

  // If we can't find a unique code after max attempts, throw error
  throw new Error('Unable to generate unique short code after maximum attempts');
}

/**
 * Validate short code format
 * @param {string} shortCode - Short code to validate
 * @returns {boolean} True if valid format
 */
function isValidShortCode(shortCode) {
  if (!shortCode || typeof shortCode !== 'string') {
    return false;
  }

  if (shortCode.length < 4 || shortCode.length > 10) {
    return false;
  }

  // Check if contains only allowed characters
  const validPattern = new RegExp(`^[${CHARACTERS}]+$`);
  return validPattern.test(shortCode);
}

module.exports = {
  generateShortCode,
  generateUniqueShortCode,
  isValidShortCode,
  CODE_LENGTH
};