import { useState, useCallback } from 'react'
import type {
  DashboardStats,
  UrlAnalytics,
  AnalyticsQueryParams,
} from '@/types'
import { analyticsApi, urlsApi, ApiRequestError } from '@/services/api'

// =============================================================================
// Dashboard Stats Hook
// =============================================================================

interface UseDashboardStatsReturn {
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null
  fetchStats: () => Promise<void>
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await analyticsApi.getDashboardStats()
      setStats(response.data)
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to fetch dashboard stats'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { stats, isLoading, error, fetchStats }
}

// =============================================================================
// URL Analytics Hook
// =============================================================================

interface UseUrlAnalyticsReturn {
  analytics: UrlAnalytics | null
  isLoading: boolean
  error: string | null
  fetchAnalytics: (urlId: string, params?: AnalyticsQueryParams) => Promise<void>
}

export function useUrlAnalytics(): UseUrlAnalyticsReturn {
  const [analytics, setAnalytics] = useState<UrlAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async (urlId: string, params?: AnalyticsQueryParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await urlsApi.getAnalytics(urlId, params)
      setAnalytics(response.data)
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to fetch analytics'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { analytics, isLoading, error, fetchAnalytics }
}

// =============================================================================
// Overall Analytics Hook
// =============================================================================

interface UseOverallAnalyticsReturn {
  analytics: UrlAnalytics | null
  isLoading: boolean
  error: string | null
  fetchAnalytics: (params?: AnalyticsQueryParams) => Promise<void>
}

export function useOverallAnalytics(): UseOverallAnalyticsReturn {
  const [analytics, setAnalytics] = useState<UrlAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async (params?: AnalyticsQueryParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await analyticsApi.getOverallAnalytics(params)
      setAnalytics(response.data)
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Failed to fetch analytics'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { analytics, isLoading, error, fetchAnalytics }
}
