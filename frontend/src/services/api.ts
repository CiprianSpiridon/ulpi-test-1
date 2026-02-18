import type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  User,
  UserProfile,
  ShortUrl,
  CreateUrlPayload,
  UpdateUrlPayload,
  UrlQueryParams,
  UrlAnalytics,
  AnalyticsQueryParams,
  DashboardStats,
  ApiKey,
  CreateApiKeyPayload,
  CreateApiKeyResponse,
} from '@/types'

// =============================================================================
// HTTP Client
// =============================================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
    }
    return url.toString()
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown
      params?: Record<string, string | number | undefined>
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params)

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        message: `Request failed with status ${response.status}`,
      })) as ApiError

      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }

      throw new ApiRequestError(
        errorBody.message ?? `Request failed with status ${response.status}`,
        response.status,
        errorBody,
      )
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    return this.request<T>('GET', path, { params })
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body })
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body })
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body })
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }
}

export class ApiRequestError extends Error {
  status: number
  details: ApiError

  constructor(message: string, status: number, details: ApiError) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.details = details
  }
}

// =============================================================================
// Singleton client instance
// =============================================================================

const client = new ApiClient(BASE_URL)

// =============================================================================
// Auth API
// =============================================================================

export const authApi = {
  login: (payload: LoginPayload): Promise<ApiResponse<AuthResponse>> =>
    client.post('/auth/login', payload),

  register: (payload: RegisterPayload): Promise<ApiResponse<AuthResponse>> =>
    client.post('/auth/register', payload),

  logout: (): Promise<void> =>
    client.post('/auth/logout'),

  me: (): Promise<ApiResponse<User>> =>
    client.get('/auth/me'),

  refreshToken: (refreshToken: string): Promise<ApiResponse<AuthResponse>> =>
    client.post('/auth/refresh', { refresh_token: refreshToken }),
}

// =============================================================================
// URLs API
// =============================================================================

export const urlsApi = {
  list: (params?: UrlQueryParams): Promise<PaginatedResponse<ShortUrl>> =>
    client.get('/urls', params as Record<string, string | number | undefined>),

  get: (id: string): Promise<ApiResponse<ShortUrl>> =>
    client.get(`/urls/${id}`),

  create: (payload: CreateUrlPayload): Promise<ApiResponse<ShortUrl>> =>
    client.post('/urls', payload),

  update: (id: string, payload: UpdateUrlPayload): Promise<ApiResponse<ShortUrl>> =>
    client.patch(`/urls/${id}`, payload),

  delete: (id: string): Promise<void> =>
    client.delete(`/urls/${id}`),

  getAnalytics: (id: string, params?: AnalyticsQueryParams): Promise<ApiResponse<UrlAnalytics>> =>
    client.get(`/urls/${id}/analytics`, params as Record<string, string | number | undefined>),
}

// =============================================================================
// Analytics API
// =============================================================================

export const analyticsApi = {
  getDashboardStats: (): Promise<ApiResponse<DashboardStats>> =>
    client.get('/analytics/dashboard'),

  getOverallAnalytics: (params?: AnalyticsQueryParams): Promise<ApiResponse<UrlAnalytics>> =>
    client.get('/analytics/overall', params as Record<string, string | number | undefined>),
}

// =============================================================================
// User / Profile API
// =============================================================================

export const userApi = {
  getProfile: (): Promise<ApiResponse<UserProfile>> =>
    client.get('/auth/profile'),

  updateProfile: (payload: {
    display_name?: string
    email?: string
  }): Promise<ApiResponse<User>> =>
    client.patch('/auth/profile', payload),

  changePassword: (payload: {
    current_password: string
    new_password: string
  }): Promise<ApiResponse<{ message: string }>> =>
    client.post('/auth/change-password', payload),

  listApiKeys: (): Promise<ApiResponse<ApiKey[]>> =>
    client.get('/auth/api-keys'),

  createApiKey: (payload: CreateApiKeyPayload): Promise<ApiResponse<CreateApiKeyResponse>> =>
    client.post('/auth/api-keys', payload),

  revokeApiKey: (id: string): Promise<void> =>
    client.delete(`/auth/api-keys/${id}`),
}
