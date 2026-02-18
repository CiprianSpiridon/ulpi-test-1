import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Card Component
// =============================================================================

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className, padding = 'md' }: CardProps): ReactNode {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
        paddingStyles[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}

// =============================================================================
// Stat Card
// =============================================================================

interface StatCardProps {
  title: string
  value: string | number
  change?: { text: string; isPositive: boolean }
  icon?: ReactNode
  className?: string
}

export function StatCard({ title, value, change, icon, className }: StatCardProps): ReactNode {
  return (
    <Card className={cn('flex items-start justify-between', className)}>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          {value}
        </p>
        {change && (
          <p
            className={cn(
              'mt-1 text-sm font-medium',
              change.isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {change.text} vs last period
          </p>
        )}
      </div>
      {icon && (
        <div className="rounded-lg bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
          {icon}
        </div>
      )}
    </Card>
  )
}
