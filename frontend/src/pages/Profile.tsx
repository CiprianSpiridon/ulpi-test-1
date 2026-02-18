import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User,
  Mail,
  Lock,
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/hooks/useAuth'
import { userApi, ApiRequestError } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDateTime, copyToClipboard } from '@/lib/utils'
import type { ApiKey, CreateApiKeyResponse } from '@/types'

// =============================================================================
// Profile Form Schema
// =============================================================================

const profileSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email'),
})

type ProfileFormData = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirm_password: z.string().min(1, 'Please confirm'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

const apiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

type ApiKeyFormData = z.infer<typeof apiKeySchema>

// =============================================================================
// Profile Page
// =============================================================================

export default function ProfilePage(): ReactNode {
  const { user, setUser } = useAuthStore()

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: user?.display_name ?? '',
      email: user?.email ?? '',
    },
  })

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoadingKeys, setIsLoadingKeys] = useState(false)
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<CreateApiKeyResponse | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  // API key form
  const {
    register: registerApiKey,
    handleSubmit: handleApiKeySubmit,
    reset: resetApiKey,
    formState: { errors: apiKeyErrors },
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  })

  // Fetch API keys
  const fetchApiKeys = useCallback(async (): Promise<void> => {
    setIsLoadingKeys(true)
    try {
      const response = await userApi.listApiKeys()
      setApiKeys(response.data)
    } catch {
      // Silently handle - API keys are supplementary
    } finally {
      setIsLoadingKeys(false)
    }
  }, [])

  useEffect(() => {
    void fetchApiKeys()
  }, [fetchApiKeys])

  // Handlers
  const onProfileSubmit = async (data: ProfileFormData): Promise<void> => {
    setIsSavingProfile(true)
    try {
      const response = await userApi.updateProfile(data)
      setUser(response.data)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData): Promise<void> => {
    setIsSavingPassword(true)
    try {
      await userApi.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      toast.success('Password changed successfully')
      resetPassword()
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to change password')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const onCreateApiKey = async (data: ApiKeyFormData): Promise<void> => {
    try {
      const response = await userApi.createApiKey({ name: data.name })
      setNewKeyResult(response.data)
      resetApiKey()
      void fetchApiKeys()
      toast.success('API key created')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to create API key')
    }
  }

  const onRevokeApiKey = async (): Promise<void> => {
    if (!revokeTarget) return
    try {
      await userApi.revokeApiKey(revokeTarget.id)
      toast.success(`API key "${revokeTarget.name}" revoked`)
      setRevokeTarget(null)
      void fetchApiKeys()
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to revoke API key')
    }
  }

  if (!user) {
    return <PageLoader message="Loading profile..." />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Profile & Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings and API keys
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <User className="h-5 w-5" />
          Profile Information
        </h2>
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4" noValidate>
          <Input
            label="Display Name"
            error={profileErrors.display_name?.message}
            leftElement={<User className="h-4 w-4" />}
            {...registerProfile('display_name')}
          />
          <Input
            label="Email"
            type="email"
            error={profileErrors.email?.message}
            leftElement={<Mail className="h-4 w-4" />}
            {...registerProfile('email')}
          />
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>
                Role: <strong className="capitalize text-gray-700 dark:text-gray-300">{user.role}</strong>
              </span>
            </div>
            <Button type="submit" isLoading={isSavingProfile}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Section */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Lock className="h-5 w-5" />
          Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
          <Input
            label="Current Password"
            type="password"
            autoComplete="current-password"
            error={passwordErrors.current_password?.message}
            leftElement={<Lock className="h-4 w-4" />}
            {...registerPassword('current_password')}
          />
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.new_password?.message}
            hint="At least 8 characters with uppercase and a number"
            leftElement={<Lock className="h-4 w-4" />}
            {...registerPassword('new_password')}
          />
          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.confirm_password?.message}
            leftElement={<Lock className="h-4 w-4" />}
            {...registerPassword('confirm_password')}
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isSavingPassword}>
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      {/* API Keys Section */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Key className="h-5 w-5" />
            API Keys
          </h2>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateKeyModal(true)}
          >
            New Key
          </Button>
        </div>

        {isLoadingKeys ? (
          <PageLoader message="Loading API keys..." />
        ) : apiKeys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center dark:border-gray-600">
            <Key className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No API keys yet. Create one for programmatic access.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {key.name}
                    </p>
                    {key.revoked_at && (
                      <Badge variant="danger">Revoked</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{key.key_prefix}...</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(key.created_at)}
                    </span>
                    {key.last_used_at && (
                      <span>Last used: {formatDateTime(key.last_used_at)}</span>
                    )}
                  </div>
                </div>
                {!key.revoked_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevokeTarget(key)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create API Key Modal */}
      <Modal
        isOpen={showCreateKeyModal && !newKeyResult}
        onClose={() => setShowCreateKeyModal(false)}
        title="Create API Key"
        description="API keys allow programmatic access to the URL shortener."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowCreateKeyModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleApiKeySubmit(onCreateApiKey)}>
              Create Key
            </Button>
          </>
        }
      >
        <form noValidate>
          <Input
            label="Key Name"
            placeholder="e.g., CI/CD Pipeline"
            error={apiKeyErrors.name?.message}
            {...registerApiKey('name')}
          />
        </form>
      </Modal>

      {/* New Key Result Modal */}
      <Modal
        isOpen={newKeyResult !== null}
        onClose={() => {
          setNewKeyResult(null)
          setShowCreateKeyModal(false)
        }}
        title="API Key Created"
        description="Copy this key now. You will not be able to see it again."
        size="lg"
        footer={
          <Button
            onClick={() => {
              setNewKeyResult(null)
              setShowCreateKeyModal(false)
            }}
          >
            Done
          </Button>
        }
      >
        {newKeyResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <code className="flex-1 break-all text-sm font-mono text-gray-900 dark:text-white">
                {newKeyResult.key}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const success = await copyToClipboard(newKeyResult.key)
                  if (success) {
                    toast.success('API key copied to clipboard')
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Store this key securely. It will only be shown once.
            </p>
          </div>
        )}
      </Modal>

      {/* Revoke Confirmation */}
      <ConfirmDialog
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void onRevokeApiKey()}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${revokeTarget?.name ?? ''}"? Any applications using this key will lose access.`}
        confirmLabel="Revoke"
        variant="danger"
      />
    </div>
  )
}
