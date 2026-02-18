/**
 * Short code generation utility.
 *
 * Generates cryptographically random short codes for URL shortening.
 * Uses Node.js crypto module for secure randomness.
 */

import crypto from 'crypto';
import { env } from '../config/env';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a cryptographically random short code.
 * Default length comes from SHORT_CODE_LENGTH environment variable.
 */
export function generateShortCode(length: number = env.shortCodeLength): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}
