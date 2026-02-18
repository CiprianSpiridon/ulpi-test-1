/**
 * DTO transformation utilities.
 *
 * Transform database rows into API response objects.
 * Ensures internal fields (password hashes, etc.) are never exposed.
 */

import { UserRow, UrlRow, UserPublicDTO, UrlDTO } from '../types';
import { env } from '../config/env';

/**
 * Transform a UserRow into a public-safe UserPublicDTO.
 * Strips password_hash, api_key_hash, and other internal fields.
 */
export function toUserDTO(user: UserRow): UserPublicDTO {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    createdAt: user.created_at,
    emailVerified: user.email_verified,
  };
}

/**
 * Transform a UrlRow into a public-safe UrlDTO.
 * Strips password_hash and generates the full short URL.
 */
export function toUrlDTO(url: UrlRow): UrlDTO {
  const slug = url.custom_slug ?? url.short_code;
  return {
    id: url.id,
    originalUrl: url.original_url,
    shortCode: url.short_code,
    customSlug: url.custom_slug,
    title: url.title,
    description: url.description,
    status: url.status,
    clicks: Number(url.clicks),
    maxClicks: url.max_clicks !== null ? Number(url.max_clicks) : null,
    hasPassword: url.password_hash !== null,
    createdAt: url.created_at,
    updatedAt: url.updated_at,
    expiresAt: url.expires_at,
    lastClickedAt: url.last_clicked_at,
    shortUrl: `${env.baseRedirectUrl}/${slug}`,
  };
}
