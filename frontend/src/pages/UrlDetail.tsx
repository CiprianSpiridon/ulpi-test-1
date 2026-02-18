import { useEffect, useState, type ReactNode } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Trash2,
  Save,
  Link2,
  MousePointerClick,
  Globe,
  Clock,
  Eye,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUrl, useUrlMutations } from '@/hooks/useUrls'
import { useUrlAnalytics } from '@/hooks/useAnalytics'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { ClicksChart, TopItemsList, TopItemsPieChart } from '@/components/ui/Charts'
import { PageLoader } from '@/components/ui/Spinner'
import {
  formatNumber,
  formatDateTime,
  buildShortUrl,
  copyToClipboard,
} from '@/lib/utils'
import type { UrlStatus } from '@/types'

// =============================================================================
// Validation Schema
// =============================================================================

const updateUrlSchema = z.object({
  title: z.string().max(255).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(['active', 'disabled', 'expired']),
  expires_at: z.string().optional().or(z.literal('')),
  max_clicks: z.string().optional().or(z.literal('')),
})

type UpdateUrlFormData = z.infer<typeof updateUrlSchema>

// =============================================================================
// URL Detail Page
// =============================================================================

export default function UrlDetailPage(): ReactNode {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { url, isLoading: urlLoading, fetchUrl } = useUrl()
  const { analytics, isLoading: analyticsLoading, fetchAnalytics } = useUrlAnalytics()
  const { updateUrl, deleteUrl, isUpdating, isDeleting } = useUrlMutations()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUrlFormData>({
    resolver: zodResolver(updateUrlSchema),
  })

  // Fetch data
  useEffect(() => {
    if (id) {
      void fetchUrl(id)
      void fetchAnalytics(id, { group_by: 'day' })
    }
  }, [id, fetchUrl, fetchAnalytics])

  // Reset form when URL data loads
  useEffect(() => {
    if (url) {
      reset({
        title: url.title ?? '',
        description: url.description ?? '',
        status: url.status,
        expires_at: url.expires_at
          ? new Date(url.expires_at).toISOString().slice(0, 16)
          : '',
        max_clicks: url.max_clicks ? String(url.max_clicks) : '',
      })
    }
  }, [url, reset])

  const handleCopy = async (): Promise<void> => {
    if (!url) return
    const shortUrl = buildShortUrl(url.custom_slug ?? url.short_code)
    const success = await copyToClipboard(shortUrl)
    if (success) {
      toast.success('Short URL copied to clipboard')
    }
  }

  const onSubmit = async (data: UpdateUrlFormData): Promise<void> => {
    if (!id) return
    const result = await updateUrl(id, {
      title: data.title || undefined,
      description: data.description || undefined,
      status: data.status as UrlStatus,
      expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      max_clicks: data.max_clicks ? Number(data.max_clicks) : null,
    })
    if (result) {
      toast.success('URL updated successfully')
      setIsEditing(false)
      void fetchUrl(id)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!id) return
    const success = await deleteUrl(id)
    if (success) {
      toast.success('URL deleted')
      navigate('/urls')
    }
  }

  if (urlLoading && !url) {
    return <PageLoader message="Loading URL details..." />
  }

  if (!url) {
    return (
      <div className="space-y-4">
        <Link
          to="/urls"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to URLs
        </Link>
        <Card className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">URL not found.</p>
        </Card>
      </div>
    )
  }

  const shortUrl = buildShortUrl(url.custom_slug ?? url.short_code)

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/urls"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to URLs
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {url.title ?? url.custom_slug ?? url.short_code}
            </h1>
            <Badge variant={getStatusBadgeVariant(url.status)}>{url.status}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              {shortUrl}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Destination:{' '}
            <a
              href={url.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:underline dark:text-gray-300"
            >
              {url.original_url}
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                leftIcon={<Save className="h-4 w-4" />}
                isLoading={isUpdating}
                onClick={handleSubmit(onSubmit)}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Clicks"
          value={formatNumber(url.clicks)}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          title="Unique Visitors"
          value={formatNumber(analytics?.summary.unique_visitors ?? 0)}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="Top Country"
          value={analytics?.summary.top_country ?? 'N/A'}
          icon={<Globe className="h-5 w-5" />}
        />
        <StatCard
          title="Created"
          value={formatDateTime(url.created_at).split(',')[0] ?? ''}
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Edit Form (conditional) */}
      {isEditing && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Edit URL
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Title"
              placeholder="Link title"
              error={errors.title?.message}
              {...register('title')}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="edit-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <textarea
                id="edit-description"
                rows={3}
                className="input-base resize-none"
                {...register('description')}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Status"
                error={errors.status?.message}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'disabled', label: 'Disabled' },
                  { value: 'expired', label: 'Expired' },
                ]}
                {...register('status')}
              />
              <Input
                label="Expiration"
                type="datetime-local"
                error={errors.expires_at?.message}
                {...register('expires_at')}
              />
              <Input
                label="Max Clicks"
                type="number"
                placeholder="Unlimited"
                min={1}
                error={errors.max_clicks?.message}
                {...register('max_clicks')}
              />
            </div>
          </form>
        </Card>
      )}

      {/* Analytics Charts */}
      {analytics && (
        <div className="space-y-6">
          {analytics.clicks_over_time.length > 0 && (
            <ClicksChart data={analytics.clicks_over_time} title="Clicks Over Time" />
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TopItemsList data={analytics.top_referrers} title="Top Referrers" />
            <TopItemsPieChart data={analytics.top_browsers} title="Browsers" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TopItemsList data={analytics.top_countries} title="Top Countries" />
            <TopItemsPieChart data={analytics.top_devices} title="Devices" />
          </div>
        </div>
      )}

      {analyticsLoading && !analytics && (
        <PageLoader message="Loading analytics..." />
      )}

      {/* URL metadata footer */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Details
        </h3>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Short Code</dt>
            <dd className="mt-0.5 font-mono font-medium text-gray-900 dark:text-white">
              {url.short_code}
            </dd>
          </div>
          {url.custom_slug && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Custom Slug</dt>
              <dd className="mt-0.5 font-mono font-medium text-gray-900 dark:text-white">
                {url.custom_slug}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Created At</dt>
            <dd className="mt-0.5 text-gray-900 dark:text-white">
              {formatDateTime(url.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Last Clicked</dt>
            <dd className="mt-0.5 text-gray-900 dark:text-white">
              {url.last_clicked_at ? formatDateTime(url.last_clicked_at) : 'Never'}
            </dd>
          </div>
          {url.expires_at && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Expires At</dt>
              <dd className="mt-0.5 text-gray-900 dark:text-white">
                {formatDateTime(url.expires_at)}
              </dd>
            </div>
          )}
          {url.max_clicks && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Max Clicks</dt>
              <dd className="mt-0.5 text-gray-900 dark:text-white">
                {url.clicks} / {url.max_clicks}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Password Protected</dt>
            <dd className="mt-0.5 text-gray-900 dark:text-white">
              {url.has_password ? 'Yes' : 'No'}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => void handleDelete()}
        title="Delete URL"
        message={`Are you sure you want to delete "${url.custom_slug ?? url.short_code}"? All analytics data will be permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
