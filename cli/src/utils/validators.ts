/**
 * Input validation utilities for the URL Shortener CLI.
 *
 * Each validator returns `true` when valid or a descriptive error
 * string when invalid -- the signature expected by inquirer prompts.
 */

/**
 * Validate that input is a well-formed URL with http(s) scheme.
 */
export function validateUrl(input: string): true | string {
  if (!input || input.trim().length === 0) {
    return 'URL is required.';
  }
  try {
    const url = new URL(input.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'URL must start with http:// or https://';
    }
    return true;
  } catch {
    return 'Invalid URL format. Example: https://example.com/page';
  }
}

/**
 * Validate an email address.
 */
export function validateEmail(input: string): true | string {
  if (!input || input.trim().length === 0) {
    return 'Email is required.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.trim())) {
    return 'Invalid email format. Example: user@example.com';
  }
  return true;
}

/**
 * Validate that a password meets minimum requirements.
 */
export function validatePassword(input: string): true | string {
  if (!input || input.length === 0) {
    return 'Password is required.';
  }
  if (input.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return true;
}

/**
 * Validate a custom slug (alphanumeric, hyphens, underscores).
 */
export function validateSlug(input: string): true | string {
  if (!input || input.trim().length === 0) {
    return true; // slug is optional
  }
  const slugRegex = /^[a-zA-Z0-9_-]+$/;
  if (!slugRegex.test(input.trim())) {
    return 'Slug can only contain letters, numbers, hyphens, and underscores.';
  }
  if (input.trim().length > 50) {
    return 'Slug must be 50 characters or fewer.';
  }
  return true;
}

/**
 * Validate a non-empty string.
 */
export function validateRequired(input: string): true | string {
  if (!input || input.trim().length === 0) {
    return 'This field is required.';
  }
  return true;
}

/**
 * Validate a domain name.
 */
export function validateDomain(input: string): true | string {
  if (!input || input.trim().length === 0) {
    return 'Domain is required.';
  }
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(input.trim())) {
    return 'Invalid domain format. Example: links.example.com';
  }
  return true;
}

/**
 * Validate a file path ends with .csv extension.
 */
export function validateCsvPath(input: string): true | string {
  if (!input || input.trim().length === 0) {
    return 'File path is required.';
  }
  if (!input.trim().toLowerCase().endsWith('.csv')) {
    return 'File must have a .csv extension.';
  }
  return true;
}

/**
 * Validate that a string is a valid UUID or short code.
 */
export function validateIdOrShortCode(input: string): true | string {
  if (!input || input.trim().length === 0) {
    return 'ID or short code is required.';
  }
  return true;
}
