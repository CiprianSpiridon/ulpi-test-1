/**
 * Shared type definitions for the URL Shortener backend.
 * These types mirror the PostgreSQL schema defined in docker/postgres/init.sql.
 */

import { Request } from 'express';

// ---------------------------------------------------------------------------
// Database enums (mirror PostgreSQL ENUM types)
// ---------------------------------------------------------------------------

export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type UrlStatus = 'active' | 'disabled' | 'expired';

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: UserRole;
  status: UserStatus;
  api_key: string | null;
  api_key_hash: string | null;
  rate_limit: number;
  max_urls: number;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  email_verified: boolean;
}

export interface UrlRow {
  id: string;
  user_id: string | null;
  original_url: string;
  short_code: string;
  custom_slug: string | null;
  title: string | null;
  description: string | null;
  status: UrlStatus;
  clicks: number;
  max_clicks: number | null;
  password_hash: string | null;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
  last_clicked_at: Date | null;
}

export interface AnalyticsRow {
  id: string;
  url_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  clicked_at: Date;
}

export interface SessionRow {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  expires_at: Date;
  last_active_at: Date;
}

// ---------------------------------------------------------------------------
// JWT payload
// ---------------------------------------------------------------------------

export interface JwtPayload {
  sub: string;       // user ID
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// ---------------------------------------------------------------------------
// Authenticated request (after JWT middleware)
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// ---------------------------------------------------------------------------
// API DTOs (Data Transfer Objects)
// ---------------------------------------------------------------------------

export interface UserPublicDTO {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: Date;
  emailVerified: boolean;
}

export interface UrlDTO {
  id: string;
  originalUrl: string;
  shortCode: string;
  customSlug: string | null;
  title: string | null;
  description: string | null;
  status: UrlStatus;
  clicks: number;
  maxClicks: number | null;
  hasPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  lastClickedAt: Date | null;
  shortUrl: string;
}

export interface AnalyticsSummaryDTO {
  totalClicks: number;
  uniqueVisitors: number;
  topCountry: string | null;
  topReferer: string | null;
  topBrowser: string | null;
  topDevice: string | null;
}

export interface DashboardStatsDTO {
  totalUrls: number;
  totalClicks: number;
  activeUrls: number;
  topUrls: Array<{
    id: string;
    shortCode: string;
    originalUrl: string;
    clicks: number;
  }>;
  clicksByDay: Array<{
    date: string;
    clicks: number;
  }>;
}

export interface ClicksByDayRow {
  date: string;
  clicks: string;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Auth tokens
// ---------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResponse {
  user: UserPublicDTO;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: UserPublicDTO;
  tokens: AuthTokens;
}
