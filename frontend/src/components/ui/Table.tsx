import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

// =============================================================================
// Table Components
// =============================================================================

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children, className }: TableProps): ReactNode {
  return (
    <thead
      className={cn(
        'border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
        className,
      )}
    >
      {children}
    </thead>
  )
}

export function TableBody({ children, className }: TableProps): ReactNode {
  return <tbody className={cn('divide-y divide-gray-200 dark:divide-gray-700', className)}>{children}</tbody>
}

export function TableRow({ children, className }: TableProps): ReactNode {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
        className,
      )}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
  colSpan?: number
}

export function TableCell({ children, className, colSpan }: TableCellProps): ReactNode {
  return (
    <td
      className={cn('px-4 py-3 text-gray-700 dark:text-gray-300', className)}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

// =============================================================================
// Sortable Header Cell
// =============================================================================

type SortDirection = 'asc' | 'desc' | null

interface SortableHeaderProps {
  label: string
  sortKey: string
  currentSortKey: string | null
  currentSortDir: SortDirection
  onSort: (key: string) => void
  className?: string
}

export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className,
}: SortableHeaderProps): ReactNode {
  const isActive = currentSortKey === sortKey

  return (
    <th className={cn('px-4 py-3', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="group inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className="flex flex-col">
          {isActive && currentSortDir === 'asc' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : isActive && currentSortDir === 'desc' ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
          )}
        </span>
      </button>
    </th>
  )
}

// =============================================================================
// Non-sortable Header Cell
// =============================================================================

interface TableHeaderCellProps {
  children: ReactNode
  className?: string
}

export function TableHeaderCell({ children, className }: TableHeaderCellProps): ReactNode {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
        className,
      )}
    >
      {children}
    </th>
  )
}

// =============================================================================
// Pagination
// =============================================================================

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
}: PaginationProps): ReactNode {
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium">{start}</span> to{' '}
        <span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 5) {
            pageNum = i + 1
          } else if (page <= 3) {
            pageNum = i + 1
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i
          } else {
            pageNum = page - 2 + i
          }
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={cn(
                'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                page === pageNum
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              {pageNum}
            </button>
          )
        })}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-500">{icon}</div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
