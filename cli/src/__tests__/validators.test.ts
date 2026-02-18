/**
 * Tests for input validation utilities.
 */

import {
  validateUrl,
  validateEmail,
  validatePassword,
  validateSlug,
  validateRequired,
  validateDomain,
  validateCsvPath,
  validateIdOrShortCode,
} from '../utils/validators.js';

describe('validateUrl', () => {
  it('should accept valid http URL', () => {
    expect(validateUrl('http://example.com')).toBe(true);
  });

  it('should accept valid https URL', () => {
    expect(validateUrl('https://example.com/page?q=1')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateUrl('')).toContain('required');
  });

  it('should reject ftp URLs', () => {
    expect(validateUrl('ftp://files.example.com')).toContain('http');
  });

  it('should reject invalid URLs', () => {
    expect(validateUrl('not-a-url')).toContain('Invalid');
  });

  it('should trim whitespace', () => {
    expect(validateUrl('  https://example.com  ')).toBe(true);
  });
});

describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateEmail('')).toContain('required');
  });

  it('should reject invalid email', () => {
    expect(validateEmail('not-an-email')).toContain('Invalid');
  });

  it('should reject email without domain', () => {
    expect(validateEmail('user@')).toContain('Invalid');
  });
});

describe('validatePassword', () => {
  it('should accept password with 8+ characters', () => {
    expect(validatePassword('password123')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validatePassword('')).toContain('required');
  });

  it('should reject short password', () => {
    expect(validatePassword('short')).toContain('8 characters');
  });
});

describe('validateSlug', () => {
  it('should accept alphanumeric slug', () => {
    expect(validateSlug('my-link-123')).toBe(true);
  });

  it('should accept underscore', () => {
    expect(validateSlug('my_link')).toBe(true);
  });

  it('should accept empty string (optional field)', () => {
    expect(validateSlug('')).toBe(true);
  });

  it('should reject special characters', () => {
    expect(validateSlug('my link!')).toContain('letters');
  });

  it('should reject slug over 50 characters', () => {
    const longSlug = 'a'.repeat(51);
    expect(validateSlug(longSlug)).toContain('50 characters');
  });
});

describe('validateRequired', () => {
  it('should accept non-empty string', () => {
    expect(validateRequired('hello')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateRequired('')).toContain('required');
  });

  it('should reject whitespace-only string', () => {
    expect(validateRequired('   ')).toContain('required');
  });
});

describe('validateDomain', () => {
  it('should accept valid domain', () => {
    expect(validateDomain('example.com')).toBe(true);
  });

  it('should accept subdomain', () => {
    expect(validateDomain('links.example.com')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateDomain('')).toContain('required');
  });

  it('should reject invalid domain', () => {
    expect(validateDomain('not a domain')).toContain('Invalid');
  });
});

describe('validateCsvPath', () => {
  it('should accept .csv file', () => {
    expect(validateCsvPath('data.csv')).toBe(true);
  });

  it('should accept path with directory', () => {
    expect(validateCsvPath('/home/user/urls.csv')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateCsvPath('')).toContain('required');
  });

  it('should reject non-CSV file', () => {
    expect(validateCsvPath('data.json')).toContain('.csv');
  });

  it('should be case-insensitive for extension', () => {
    expect(validateCsvPath('data.CSV')).toBe(true);
  });
});

describe('validateIdOrShortCode', () => {
  it('should accept non-empty string', () => {
    expect(validateIdOrShortCode('abc1234')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateIdOrShortCode('')).toContain('required');
  });
});
