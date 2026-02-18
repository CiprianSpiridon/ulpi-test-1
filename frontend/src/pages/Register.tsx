import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link2, Mail, Lock, UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// =============================================================================
// Validation Schema
// =============================================================================

const registerSchema = z
  .object({
    display_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

// =============================================================================
// Register Page
// =============================================================================

export default function RegisterPage(): ReactNode {
  const navigate = useNavigate()
  const { register: registerUser, isLoading, error, clearError } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      display_name: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  })

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    clearError()
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        display_name: data.display_name,
      })
      toast.success('Account created successfully!')
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
          Create an account
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Start shortening your URLs in seconds
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
            label="Display Name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            error={errors.display_name?.message}
            leftElement={<UserIcon className="h-4 w-4" />}
            {...register('display_name')}
          />

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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            hint="Must include uppercase, lowercase, and a number"
            leftElement={<Lock className="h-4 w-4" />}
            {...register('password')}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            error={errors.confirm_password?.message}
            leftElement={<Lock className="h-4 w-4" />}
            {...register('confirm_password')}
          />

          <Button type="submit" isLoading={isLoading} className="w-full">
            Create account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
