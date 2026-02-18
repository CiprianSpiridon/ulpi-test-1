import { useState, useCallback } from 'react'
import type {
  ShortUrl,
  CreateUrlPayload,
  UpdateUrlPayload,
  UrlQueryParams,
  PaginatedResponse,
} from '@/types'
import { urlsApi, ApiRequestError } from '@/services/api'

// =============================================================================
// URL List Hook
// =============================================================================

interface UseUrlsReturn {
  urls: ShortUrl[]
  pagination: PaginatedResponse<ShortUrl>['pagination'] | null
  isLoading: boolean
  error: string | null
  fetchUrls: (params?: UrlQueryParams) => Promise<void>
  refetch: () => Promise<void>
}

export function useUrls(): UseUrlsReturn {
  const [urls, setUrls] = useState<ShortUrl[]>([])
  const [pagination, setPagination] = useState<PaginatedResponse<ShortUrl>['pagination'] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastParams, setLastParams] = useState<UrlQueryParams | undefined>()

  const fetchUrls = useCallback(async (params?: UrlQueryParams) => {
    setIsLoading(true)
    setError(null)
    setLastParams(params)
    try {
      const response = await urlsApi.list(params)
      setUrls(response.data)
      setPagination(response.pagination)
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to fetch URLs'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchUrls(lastParams)
  }, [fetchUrls, lastParams])

  return { urls, pagination, isLoading, error, fetchUrls, refetch }
}

// =============================================================================
// Single URL Hook
// =============================================================================

interface UseUrlReturn {
  url: ShortUrl | null
  isLoading: boolean
  error: string | null
  fetchUrl: (id: string) => Promise<void>
}

export function useUrl(): UseUrlReturn {
  const [url, setUrl] = useState<ShortUrl | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUrl = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await urlsApi.get(id)
      setUrl(response.data)
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to fetch URL'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { url, isLoading, error, fetchUrl }
}

// =============================================================================
// URL Mutations Hook
// =============================================================================

interface UseUrlMutationsReturn {
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  createUrl: (payload: CreateUrlPayload) => Promise<ShortUrl | null>
  updateUrl: (id: string, payload: UpdateUrlPayload) => Promise<ShortUrl | null>
  deleteUrl: (id: string) => Promise<boolean>
  clearError: () => void
}

export function useUrlMutations(): UseUrlMutationsReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createUrl = useCallback(async (payload: CreateUrlPayload): Promise<ShortUrl | null> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await urlsApi.create(payload)
      return response.data
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to create URL'
      setError(message)
      return null
    } finally {
      setIsCreating(false)
    }
  }, [])

  const updateUrl = useCallback(async (id: string, payload: UpdateUrlPayload): Promise<ShortUrl | null> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await urlsApi.update(id, payload)
      return response.data
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to update URL'
      setError(message)
      return null
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const deleteUrl = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true)
    setError(null)
    try {
      await urlsApi.delete(id)
      return true
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to delete URL'
      setError(message)
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    isCreating,
    isUpdating,
    isDeleting,
    error,
    createUrl,
    updateUrl,
    deleteUrl,
    clearError,
  }
}
