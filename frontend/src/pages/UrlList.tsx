import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  ExternalLink,
  Copy,
  Trash2,
  BarChart3,
  Link2,
  MoreHorizontal,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUrls, useUrlMutations } from '@/hooks/useUrls'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  SortableHeader,
  TableHeaderCell,
  Pagination,
  EmptyState,
} from '@/components/ui/Table'
import { PageLoader } from '@/components/ui/Spinner'
import {
  formatNumber,
  formatDate,
  truncateUrl,
  buildShortUrl,
  copyToClipboard,
} from '@/lib/utils'
import type { UrlStatus, UrlQueryParams } from '@/types'

// =============================================================================
// URL List Page
// =============================================================================

export default function UrlListPage(): ReactNode {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { urls, pagination, isLoading, fetchUrls } = useUrls()
  const { deleteUrl, isDeleting } = useUrlMutations()

  // Local state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '')
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort_by') ?? 'created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sort_order') as 'asc' | 'desc') ?? 'desc',
  )
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'))
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null)

  // Build query params
  const buildParams = useCallback((): UrlQueryParams => {
    const params: UrlQueryParams = {
      page,
      per_page: 15,
      sort_by: sortBy as UrlQueryParams['sort_by'],
      sort_order: sortOrder,
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim()
    }
    if (statusFilter) {
      params.status = statusFilter as UrlStatus
    }
    return params
  }, [page, sortBy, sortOrder, searchTerm, statusFilter])

  // Fetch URLs on param change
  useEffect(() => {
    void fetchUrls(buildParams())

    // Sync URL search params
    const newParams = new URLSearchParams()
    if (searchTerm) newParams.set('search', searchTerm)
    if (statusFilter) newParams.set('status', statusFilter)
    if (sortBy !== 'created_at') newParams.set('sort_by', sortBy)
    if (sortOrder !== 'desc') newParams.set('sort_order', sortOrder)
    if (page > 1) newParams.set('page', String(page))
    setSearchParams(newParams, { replace: true })
  }, [fetchUrls, buildParams, searchTerm, statusFilter, sortBy, sortOrder, page, setSearchParams])

  // Handlers
  const handleSort = (key: string): void => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleCopy = async (shortCode: string): Promise<void> => {
    const url = buildShortUrl(shortCode)
    const success = await copyToClipboard(url)
    if (success) {
      toast.success('Short URL copied to clipboard')
    } else {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    const success = await deleteUrl(deleteTarget.id)
    if (success) {
      toast.success(`URL "${deleteTarget.code}" deleted`)
      setDeleteTarget(null)
      void fetchUrls(buildParams())
    } else {
      toast.error('Failed to delete URL')
    }
  }

  const handleSearch = (value: string): void => {
    setSearchTerm(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            URLs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your shortened URLs
          </p>
        </div>
        <Link to="/urls/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Create URL</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              placeholder="Search URLs..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              leftElement={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'disabled', label: 'Disabled' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {isLoading && urls.length === 0 ? (
          <PageLoader message="Loading URLs..." />
        ) : urls.length === 0 ? (
          <EmptyState
            icon={<Link2 className="h-12 w-12" />}
            title="No URLs found"
            description={
              searchTerm || statusFilter
                ? 'Try adjusting your filters'
                : 'Create your first short URL to get started'
            }
            action={
              !searchTerm && !statusFilter ? (
                <Link to="/urls/new">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Create URL</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <SortableHeader
                    label="Short URL"
                    sortKey="title"
                    currentSortKey={sortBy}
                    currentSortDir={sortBy === 'title' ? sortOrder : null}
                    onSort={handleSort}
                  />
                  <TableHeaderCell className="hidden lg:table-cell">
                    Original URL
                  </TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <SortableHeader
                    label="Clicks"
                    sortKey="clicks"
                    currentSortKey={sortBy}
                    currentSortDir={sortBy === 'clicks' ? sortOrder : null}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Created"
                    sortKey="created_at"
                    currentSortKey={sortBy}
                    currentSortDir={sortBy === 'created_at' ? sortOrder : null}
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  />
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {urls.map((url) => (
                  <TableRow key={url.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <Link
                          to={`/urls/${url.id}`}
                          className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
                        >
                          {url.custom_slug ?? url.short_code}
                        </Link>
                        {url.title && (
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                            {url.title}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-xs lg:table-cell">
                      <a
                        href={url.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 truncate text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {truncateUrl(url.original_url, 45)}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(url.status)}>
                        {url.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatNumber(url.clicks)}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(url.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleCopy(url.custom_slug ?? url.short_code)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title="Copy short URL"
                          aria-label="Copy short URL"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/urls/${url.id}`)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title="View analytics"
                          aria-label="View analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: url.id,
                              code: url.custom_slug ?? url.short_code,
                            })
                          }
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Delete URL"
                          aria-label="Delete URL"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {pagination && pagination.total_pages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.total_pages}
                total={pagination.total}
                perPage={pagination.per_page}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete URL"
        message={`Are you sure you want to delete "${deleteTarget?.code ?? ''}"? This action cannot be undone and all analytics data will be lost.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
