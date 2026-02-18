// =============================================================================
// Core Domain Types - aligned with PostgreSQL schema
// =============================================================================

export type UserRole = 'user' | 'admin' | 'superadmin'
export type UserStatus = 'active' | 'suspended' | 'deleted'
export type UrlStatus = 'active' | 'disabled' | 'expired'

// =============================================================================
// User
// =============================================================================

export interface User {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  status: UserStatus
  rate_limit: number
  max_urls: number
  created_at: string
  updated_at: string
  last_login_at: string | null
  email_verified: boolean
}

export interface UserProfile extends User {
  url_count: number
  total_clicks: number
}

// =============================================================================
// URL
// =============================================================================

export interface ShortUrl {
  id: string
  user_id: string | null
  original_url: string
  short_code: string
  custom_slug: string | null
  title: string | null
  description: string | null
  status: UrlStatus
  clicks: number
  max_clicks: number | null
  has_password: boolean
  created_at: string
  updated_at: string
  expires_at: string | null
  last_clicked_at: string | null
}

export interface CreateUrlPayload {
  original_url: string
  custom_slug?: string
  title?: string
  description?: string
  expires_at?: string
  max_clicks?: number
  password?: string
}

export interface UpdateUrlPayload {
  original_url?: string
  custom_slug?: string
  title?: string
  description?: string
  status?: UrlStatus
  expires_at?: string | null
  max_clicks?: number | null
  password?: string | null
}

// =============================================================================
// Analytics
// =============================================================================

export interface ClickEvent {
  id: string
  url_id: string
  ip_address: string | null
  user_agent: string | null
  referer: string | null
  country: string | null
  city: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  clicked_at: string
}

export interface AnalyticsSummary {
  total_clicks: number
  unique_visitors: number
  top_country: string | null
  top_referer: string | null
  top_browser: string | null
  top_device: string | null
}

export interface ClicksOverTime {
  date: string
  clicks: number
}

export interface TopItem {
  name: string
  count: number
  percentage: number
}

export interface UrlAnalytics {
  summary: AnalyticsSummary
  clicks_over_time: ClicksOverTime[]
  top_referrers: TopItem[]
  top_countries: TopItem[]
  top_browsers: TopItem[]
  top_devices: TopItem[]
  top_os: TopItem[]
}

export interface DashboardStats {
  total_urls: number
  total_clicks: number
  active_urls: number
  urls_created_today: number
  clicks_today: number
  clicks_change_percent: number
}

// =============================================================================
// API Keys
// =============================================================================

export interface ApiKey {
  id: string
  key_prefix: string
  name: string
  scopes: string[]
  rate_limit: number
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  revoked_at: string | null
}

export interface CreateApiKeyPayload {
  name: string
  scopes?: string[]
  expires_at?: string
}

export interface CreateApiKeyResponse {
  api_key: ApiKey
  key: string // Full key, shown only once
}

// =============================================================================
// Auth
// =============================================================================

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  display_name?: string
}

export interface AuthResponse {
  user: User
  token: string
  refresh_token: string
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}

// =============================================================================
// Query Parameters
// =============================================================================

export interface UrlQueryParams {
  page?: number
  per_page?: number
  search?: string
  status?: UrlStatus
  sort_by?: 'created_at' | 'clicks' | 'title' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

export interface AnalyticsQueryParams {
  start_date?: string
  end_date?: string
  group_by?: 'hour' | 'day' | 'week' | 'month'
}
