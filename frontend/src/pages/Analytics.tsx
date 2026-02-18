import { useEffect, useState, type ReactNode } from 'react'
import {
  MousePointerClick,
  Eye,
  Globe,
  Monitor,
  CalendarDays,
} from 'lucide-react'
import { useOverallAnalytics, useDashboardStats } from '@/hooks/useAnalytics'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import {
  ClicksChart,
  TopItemsBarChart,
  TopItemsPieChart,
  TopItemsList,
} from '@/components/ui/Charts'
import { PageLoader } from '@/components/ui/Spinner'
import { formatNumber } from '@/lib/utils'
import type { AnalyticsQueryParams } from '@/types'

// =============================================================================
// Analytics Page
// =============================================================================

type DateRange = '7d' | '30d' | '90d' | 'custom'
type GroupBy = 'hour' | 'day' | 'week' | 'month'

function getDateRange(range: DateRange): { start_date?: string; end_date?: string } {
  const now = new Date()
  const end = now.toISOString().split('T')[0]!

  switch (range) {
    case '7d': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { start_date: start.toISOString().split('T')[0], end_date: end }
    }
    case '30d': {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { start_date: start.toISOString().split('T')[0], end_date: end }
    }
    case '90d': {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { start_date: start.toISOString().split('T')[0], end_date: end }
    }
    default:
      return {}
  }
}

export default function AnalyticsPage(): ReactNode {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')

  const { analytics, isLoading, fetchAnalytics } = useOverallAnalytics()
  const { stats, fetchStats } = useDashboardStats()

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  useEffect(() => {
    const range = getDateRange(dateRange)
    const params: AnalyticsQueryParams = {
      ...range,
      group_by: groupBy,
    }
    void fetchAnalytics(params)
  }, [dateRange, groupBy, fetchAnalytics])

  if (isLoading && !analytics) {
    return <PageLoader message="Loading analytics..." />
  }

  const summary = analytics?.summary

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comprehensive view of your URL performance
          </p>
        </div>

        {/* Date Range Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  dateRange === range
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            options={[
              { value: 'hour', label: 'Hourly' },
              { value: 'day', label: 'Daily' },
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
            ]}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clicks"
          value={formatNumber(summary?.total_clicks ?? stats?.total_clicks ?? 0)}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          title="Unique Visitors"
          value={formatNumber(summary?.unique_visitors ?? 0)}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="Top Country"
          value={summary?.top_country ?? 'N/A'}
          icon={<Globe className="h-5 w-5" />}
        />
        <StatCard
          title="Top Device"
          value={summary?.top_device ?? 'N/A'}
          icon={<Monitor className="h-5 w-5" />}
        />
      </div>

      {/* Clicks Over Time */}
      {analytics?.clicks_over_time && analytics.clicks_over_time.length > 0 ? (
        <ClicksChart data={analytics.clicks_over_time} title="Click Trends" />
      ) : (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No click data available for the selected period
          </p>
        </Card>
      )}

      {/* Analytics Breakdown */}
      {analytics && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopItemsBarChart
              data={analytics.top_referrers}
              title="Top Referrers"
            />
            <TopItemsList
              data={analytics.top_countries}
              title="Top Countries"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TopItemsPieChart
              data={analytics.top_browsers}
              title="Browsers"
            />
            <TopItemsPieChart
              data={analytics.top_devices}
              title="Devices"
            />
            <TopItemsPieChart
              data={analytics.top_os}
              title="Operating Systems"
            />
          </div>
        </>
      )}
    </div>
  )
}
