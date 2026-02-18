import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { Layout, AuthLayout } from '@/components/layout/Layout'
import { useAuthStore, useIsAuthenticated } from '@/hooks/useAuth'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// =============================================================================
// Lazy-loaded Pages
// =============================================================================

const LoginPage = lazy(() => import('@/pages/Login'))
const RegisterPage = lazy(() => import('@/pages/Register'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const UrlListPage = lazy(() => import('@/pages/UrlList'))
const UrlCreatePage = lazy(() => import('@/pages/UrlCreate'))
const UrlDetailPage = lazy(() => import('@/pages/UrlDetail'))
const AnalyticsPage = lazy(() => import('@/pages/Analytics'))
const ProfilePage = lazy(() => import('@/pages/Profile'))

// =============================================================================
// Auth Guard
// =============================================================================

function RequireAuth({ children }: { children: ReactNode }): ReactNode {
  const isAuthenticated = useIsAuthenticated()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function RequireGuest({ children }: { children: ReactNode }): ReactNode {
  const isAuthenticated = useIsAuthenticated()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// =============================================================================
// Error Fallback
// =============================================================================

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}): ReactNode {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={resetErrorBoundary}
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Not Found
// =============================================================================

function NotFoundPage(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-6xl font-bold text-gray-200 dark:text-gray-700">404</p>
      <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        The page you are looking for does not exist.
      </p>
      <Button
        variant="outline"
        className="mt-6"
        onClick={() => (window.location.href = '/dashboard')}
      >
        Go to Dashboard
      </Button>
    </div>
  )
}

// =============================================================================
// Auth Initializer
// =============================================================================

function AuthInitializer({ children }: { children: ReactNode }): ReactNode {
  const fetchUser = useAuthStore((s) => s.fetchUser)
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (isAuthenticated) {
      void fetchUser()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  if (isAuthenticated && isLoading) {
    return <PageLoader message="Authenticating..." />
  }

  return <>{children}</>
}

// =============================================================================
// App
// =============================================================================

export function App(): ReactNode {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <BrowserRouter>
        <AuthInitializer>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public / Auth Routes */}
              <Route
                element={
                  <RequireGuest>
                    <AuthLayout />
                  </RequireGuest>
                }
              >
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected Routes */}
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/urls" element={<UrlListPage />} />
                <Route path="/urls/new" element={<UrlCreatePage />} />
                <Route path="/urls/:id" element={<UrlDetailPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Redirects & 404 */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthInitializer>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
