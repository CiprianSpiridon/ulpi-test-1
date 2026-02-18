import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginPayload, RegisterPayload } from '@/types'
import { authApi, ApiRequestError } from '@/services/api'

// =============================================================================
// Auth Store
// =============================================================================

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
  clearError: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(payload)
          const { user, token, refresh_token } = response.data
          localStorage.setItem('auth_token', token)
          localStorage.setItem('refresh_token', refresh_token)
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : 'An unexpected error occurred'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.register(payload)
          const { user, token, refresh_token } = response.data
          localStorage.setItem('auth_token', token)
          localStorage.setItem('refresh_token', refresh_token)
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : 'An unexpected error occurred'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // Logout even if the API call fails
        } finally {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      fetchUser: async () => {
        const { token } = get()
        if (!token) {
          return
        }
        set({ isLoading: true })
        try {
          const response = await authApi.me()
          set({ user: response.data, isAuthenticated: true, isLoading: false })
        } catch {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// =============================================================================
// Selectors
// =============================================================================

export const useUser = (): User | null => useAuthStore((s) => s.user)
export const useIsAuthenticated = (): boolean => useAuthStore((s) => s.isAuthenticated)
export const useAuthLoading = (): boolean => useAuthStore((s) => s.isLoading)
export const useAuthError = (): string | null => useAuthStore((s) => s.error)
