import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Link2,
  MousePointerClick,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Globe,
  Clock,
} from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ClicksChart } from '@/components/ui/Charts'
import { PageLoader } from '@/components/ui/Spinner'
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge'
import { useDashboardStats } from '@/hooks/useAnalytics'
import { useUrls } from '@/hooks/useUrls'
import { useOverallAnalytics } from '@/hooks/useAnalytics'
import { formatNumber, formatPercentChange, formatDate, truncateUrl, buildShortUrl } from '@/lib/utils'

// =============================================================================
// Dashboard Page
// =============================================================================

export default function DashboardPage(): ReactNode {
  const { stats, isLoading: statsLoading, fetchStats } = useDashboardStats()
  const { urls, isLoading: urlsLoading, fetchUrls } = useUrls()
  const { analytics, fetchAnalytics } = useOverallAnalytics()

  useEffect(() => {
    void fetchStats()
    void fetchUrls({ per_page: 5, sort_by: 'created_at', sort_order: 'desc' })
    void fetchAnalytics({ group_by: 'day' })
  }, [fetchStats, fetchUrls, fetchAnalytics])

  if (statsLoading && !stats) {
    return <PageLoader message="Loading dashboard..." />
  }

  const clicksChange = stats
    ? formatPercentChange(stats.clicks_change_percent)
    : null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of your URL shortener activity
          </p>
        </div>
        <Link to="/urls/new">
          <Button leftIcon={<PlusCircle className="h-4 w-4" />}>
            Create Short URL
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total URLs"
          value={stats ? formatNumber(stats.total_urls) : '0'}
          icon={<Link2 className="h-5 w-5" />}
        />
        <StatCard
          title="Total Clicks"
          value={stats ? formatNumber(stats.total_clicks) : '0'}
          change={clicksChange ?? undefined}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          title="Active URLs"
          value={stats ? formatNumber(stats.active_urls) : '0'}
          icon={<Globe className="h-5 w-5" />}
        />
        <StatCard
          title="Today's Clicks"
          value={stats ? formatNumber(stats.clicks_today) : '0'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      {analytics?.clicks_over_time && analytics.clicks_over_time.length > 0 && (
        <ClicksChart data={analytics.clicks_over_time} title="Click Activity (Last 30 Days)" />
      )}

      {/* Recent URLs */}
      <Card padding="none">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent URLs
          </h2>
          <Link
            to="/urls"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {urlsLoading && urls.length === 0 ? (
          <div className="p-6">
            <PageLoader message="Loading recent URLs..." />
          </div>
        ) : urls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No URLs created yet.{' '}
              <Link to="/urls/new" className="text-brand-600 hover:underline dark:text-brand-400">
                Create your first one
              </Link>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {urls.map((url) => (
              <Link
                key={url.id}
                to={`/urls/${url.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-brand-600 dark:text-brand-400">
                      {buildShortUrl(url.custom_slug ?? url.short_code)}
                    </p>
                    <Badge variant={getStatusBadgeVariant(url.status)}>
                      {url.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {truncateUrl(url.original_url, 60)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatNumber(url.clicks)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">clicks</p>
                  </div>
                  <div className="hidden sm:block">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(url.created_at)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
