import { type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Link2, Tag, FileText, Clock, Hash, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useUrlMutations } from '@/hooks/useUrls'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { buildShortUrl, copyToClipboard } from '@/lib/utils'

// =============================================================================
// Validation Schema
// =============================================================================

const createUrlSchema = z.object({
  original_url: z
    .string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'URL must start with http:// or https://',
    }),
  custom_slug: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z0-9_-]*$/, 'Only letters, numbers, hyphens, and underscores')
    .optional()
    .or(z.literal('')),
  title: z.string().max(255).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  expires_at: z.string().optional().or(z.literal('')),
  max_clicks: z.string().optional().or(z.literal('')),
  password: z.string().optional().or(z.literal('')),
})

type CreateUrlFormData = z.infer<typeof createUrlSchema>

// =============================================================================
// URL Create Page
// =============================================================================

export default function UrlCreatePage(): ReactNode {
  const navigate = useNavigate()
  const { createUrl, isCreating, error, clearError } = useUrlMutations()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUrlFormData>({
    resolver: zodResolver(createUrlSchema),
    defaultValues: {
      original_url: '',
      custom_slug: '',
      title: '',
      description: '',
      expires_at: '',
      max_clicks: '',
      password: '',
    },
  })

  const onSubmit = async (data: CreateUrlFormData): Promise<void> => {
    clearError()
    const payload = {
      original_url: data.original_url,
      ...(data.custom_slug ? { custom_slug: data.custom_slug } : {}),
      ...(data.title ? { title: data.title } : {}),
      ...(data.description ? { description: data.description } : {}),
      ...(data.expires_at ? { expires_at: new Date(data.expires_at).toISOString() } : {}),
      ...(data.max_clicks ? { max_clicks: Number(data.max_clicks) } : {}),
      ...(data.password ? { password: data.password } : {}),
    }

    const result = await createUrl(payload)
    if (result) {
      const shortUrl = buildShortUrl(result.custom_slug ?? result.short_code)
      await copyToClipboard(shortUrl)
      toast.success('URL created! Short URL copied to clipboard.', {
        description: shortUrl,
      })
      navigate(`/urls/${result.id}`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back Link */}
      <Link
        to="/urls"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to URLs
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Short URL
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Shorten a long URL and optionally customize the slug
        </p>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* API Error */}
          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Original URL */}
          <Input
            label="Destination URL"
            type="url"
            placeholder="https://example.com/very-long-url..."
            error={errors.original_url?.message}
            leftElement={<Link2 className="h-4 w-4" />}
            {...register('original_url')}
          />

          {/* Custom Slug */}
          <Input
            label="Custom Slug (optional)"
            type="text"
            placeholder="my-custom-url"
            hint="Leave blank for auto-generated code"
            error={errors.custom_slug?.message}
            leftElement={<Tag className="h-4 w-4" />}
            {...register('custom_slug')}
          />

          {/* Title */}
          <Input
            label="Title (optional)"
            type="text"
            placeholder="My awesome link"
            error={errors.title?.message}
            leftElement={<FileText className="h-4 w-4" />}
            {...register('title')}
          />

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="A brief description of where this URL points..."
              className="input-base resize-none"
              {...register('description')}
            />
          </div>

          {/* Expiration & Max Clicks Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Expiration Date (optional)"
              type="datetime-local"
              error={errors.expires_at?.message}
              leftElement={<Clock className="h-4 w-4" />}
              {...register('expires_at')}
            />

            <Input
              label="Max Clicks (optional)"
              type="number"
              placeholder="Unlimited"
              min={1}
              error={errors.max_clicks?.message}
              leftElement={<Hash className="h-4 w-4" />}
              {...register('max_clicks')}
            />
          </div>

          {/* Password */}
          <Input
            label="Password Protection (optional)"
            type="password"
            placeholder="Leave blank for public access"
            error={errors.password?.message}
            leftElement={<Lock className="h-4 w-4" />}
            {...register('password')}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/urls')}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Short URL
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
