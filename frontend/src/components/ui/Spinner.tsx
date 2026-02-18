import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// =============================================================================
// Spinner Component
// =============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function Spinner({ size = 'md', className }: SpinnerProps): ReactNode {
  return (
    <Loader2
      className={cn('animate-spin text-brand-600 dark:text-brand-400', sizeStyles[size], className)}
      aria-hidden="true"
    />
  )
}

// =============================================================================
// Full Page Loader
// =============================================================================

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps): ReactNode {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4" role="status">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  )
}

// =============================================================================
// Skeleton Loader
// =============================================================================

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps): ReactNode {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className,
      )}
    />
  )
}
