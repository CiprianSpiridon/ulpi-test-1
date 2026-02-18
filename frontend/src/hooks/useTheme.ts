import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolvedTheme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  if (resolvedTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),
      setTheme: (theme: Theme) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
        applyTheme(resolvedTheme)
        set({ theme, resolvedTheme })
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = state.theme === 'system' ? getSystemTheme() : state.theme
          applyTheme(resolvedTheme)
          state.resolvedTheme = resolvedTheme
        }
      },
    },
  ),
)

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState()
    if (state.theme === 'system') {
      const resolvedTheme = getSystemTheme()
      applyTheme(resolvedTheme)
      useThemeStore.setState({ resolvedTheme })
    }
  })
}

export const useTheme = (): Theme => useThemeStore((s) => s.theme)
export const useResolvedTheme = (): 'light' | 'dark' => useThemeStore((s) => s.resolvedTheme)
