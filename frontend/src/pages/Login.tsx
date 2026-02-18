import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link2, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// =============================================================================
// Validation Schema
// =============================================================================

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

// =============================================================================
// Login Page
// =============================================================================

export default function LoginPage(): ReactNode {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    clearError()
    try {
      await login(data)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch {
      // Error is handled by the store
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
          <Link2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Sign in to your account to continue
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* API Error */}
          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            leftElement={<Mail className="h-4 w-4" />}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password?.message}
            leftElement={<Lock className="h-4 w-4" />}
            {...register('password')}
          />

          <Button type="submit" isLoading={isLoading} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Demo credentials hint */}
      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-center text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        Demo: admin@urlshortener.local / admin123
      </div>
    </div>
  )
}
