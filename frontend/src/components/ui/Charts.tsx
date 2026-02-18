import { type ReactNode } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { ClicksOverTime, TopItem } from '@/types'
import { Card } from './Card'

// =============================================================================
// Color palette for charts
// =============================================================================

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

// =============================================================================
// Clicks Over Time - Area Chart
// =============================================================================

interface ClicksChartProps {
  data: ClicksOverTime[]
  title?: string
}

export function ClicksChart({ data, title = 'Clicks Over Time' }: ClicksChartProps): ReactNode {
  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, #fff)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#clickGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// =============================================================================
// Top Items - Bar Chart
// =============================================================================

interface TopItemsBarChartProps {
  data: TopItem[]
  title: string
}

export function TopItemsBarChart({ data, title }: TopItemsBarChartProps): ReactNode {
  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
              formatter={(value: number) => [value, 'Clicks']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.slice(0, 8).map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// =============================================================================
// Top Items - Pie/Donut Chart
// =============================================================================

interface TopItemsPieChartProps {
  data: TopItem[]
  title: string
}

export function TopItemsPieChart({ data, title }: TopItemsPieChartProps): ReactNode {
  const chartData = data.slice(0, 6)

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="count"
              nameKey="name"
              paddingAngle={2}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// =============================================================================
// Top Items List (non-chart)
// =============================================================================

interface TopItemsListProps {
  data: TopItem[]
  title: string
}

export function TopItemsList({ data, title }: TopItemsListProps): ReactNode {
  const maxCount = data.length > 0 ? (data[0]?.count ?? 0) : 1

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="space-y-3">
        {data.slice(0, 8).map((item) => (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {item.name || 'Unknown'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {item.count} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">No data available</p>
        )}
      </div>
    </Card>
  )
}
