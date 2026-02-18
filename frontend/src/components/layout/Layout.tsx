import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Toaster } from 'sonner'

// =============================================================================
// Authenticated Layout (wraps all protected pages)
// =============================================================================

export function Layout(): ReactNode {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-gray-200 py-4 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-400 sm:px-6 lg:px-8">
          URL Shortener Admin Dashboard
        </div>
      </footer>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}

// =============================================================================
// Auth Layout (for login/register pages)
// =============================================================================

export function AuthLayout(): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Outlet />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}
