import { clsx, type ClassValue } from 'clsx'

/**
 * Merge class names with clsx. Utility for combining Tailwind classes conditionally.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

/**
 * Format a number with compact notation (1.2K, 3.4M, etc.)
 */
export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Format a date string to a human-readable relative time or short date.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Format a date string to a full date-time display.
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Truncate a URL for display, showing domain + truncated path.
 */
export function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) {
    return url
  }
  try {
    const parsed = new URL(url)
    const base = `${parsed.protocol}//${parsed.host}`
    if (base.length >= maxLength) {
      return `${base.slice(0, maxLength - 3)}...`
    }
    const remainingLength = maxLength - base.length - 3
    const path = parsed.pathname + parsed.search
    return `${base}${path.slice(0, remainingLength)}...`
  } catch {
    return `${url.slice(0, maxLength - 3)}...`
  }
}

/**
 * Build the full short URL from a short code.
 */
export function buildShortUrl(shortCode: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
  return `${baseUrl}/${shortCode}`
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

/**
 * Get a percentage change string with arrow indicator.
 */
export function formatPercentChange(percent: number): { text: string; isPositive: boolean } {
  const isPositive = percent >= 0
  const text = `${isPositive ? '+' : ''}${percent.toFixed(1)}%`
  return { text, isPositive }
}

/**
 * Generate a color from a string hash (for charts and avatars).
 */
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 65%, 55%)`
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
