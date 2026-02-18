/**
 * HTTP API client for communicating with the URL Shortener backend.
 *
 * Wraps the native Node.js `fetch` API with:
 *   - Automatic authentication header injection
 *   - Structured error handling via ApiError
 *   - JSON serialization / deserialization
 *   - Configurable timeout via AbortController
 */

import { getConfigValue } from './config.js';
import { ApiError, AuthenticationError, NetworkError } from './errors.js';
import { logger } from './logger.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  /** When true, skip attaching the auth header. */
  noAuth?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Build the full URL from a relative path.
 */
function buildUrl(path: string): string {
  const baseUrl = getConfigValue('apiUrl');
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Build the Authorization header value.
 */
function getAuthHeader(): string | undefined {
  const apiKey = getConfigValue('apiKey');
  if (apiKey) {
    return `Bearer ${apiKey}`;
  }

  const token = getConfigValue('authToken');
  if (token) {
    return `Bearer ${token}`;
  }

  return undefined;
}

/**
 * Execute an API request and return the parsed response.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    timeout = DEFAULT_TIMEOUT_MS,
    noAuth = false,
  } = options;

  const url = buildUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extraHeaders,
  };

  if (!noAuth) {
    const authHeader = getAuthHeader();
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
  }

  logger.debug({ method, url }, 'API request');

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: T;
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    if (!response.ok) {
      logger.debug({ status: response.status, data }, 'API error response');

      if (response.status === 401) {
        throw new AuthenticationError('Session expired or invalid credentials');
      }

      const message =
        (data as Record<string, unknown>)?.['message'] ??
        (data as Record<string, unknown>)?.['error'] ??
        `Request failed with status ${response.status}`;

      throw new ApiError(String(message), response.status, data);
    }

    logger.debug({ status: response.status }, 'API response OK');

    return { data, status: response.status, headers: response.headers };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError || error instanceof AuthenticationError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NetworkError(
        `Request timed out after ${timeout / 1000}s`,
        url,
      );
    }

    const fetchError = error as NodeJS.ErrnoException;
    if (
      fetchError.code === 'ECONNREFUSED' ||
      fetchError.code === 'ENOTFOUND' ||
      fetchError.cause
    ) {
      throw new NetworkError(
        `Could not connect to the API at ${url}`,
        url,
      );
    }

    throw new NetworkError(
      `Network error: ${fetchError.message ?? 'Unknown error'}`,
      url,
    );
  }
}

/** Convenience helpers */
export async function apiGet<T = unknown>(
  path: string,
  options?: Omit<ApiRequestOptions, 'method'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { ...options, method: 'GET' });
}

export async function apiPost<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { ...options, method: 'POST', body });
}

export async function apiPut<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { ...options, method: 'PUT', body });
}

export async function apiPatch<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { ...options, method: 'PATCH', body });
}

export async function apiDelete<T = unknown>(
  path: string,
  options?: Omit<ApiRequestOptions, 'method'>,
): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { ...options, method: 'DELETE' });
}
