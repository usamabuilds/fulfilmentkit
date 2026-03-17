import { getPreferredLocale, getPreferredTimezone } from '@/lib/store/preferencesStore'

interface DateFormatOptions {
  locale?: string
  timeZone?: string
}

export function formatDate(dateString: string, options?: DateFormatOptions): string {
  return new Intl.DateTimeFormat(options?.locale ?? getPreferredLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: options?.timeZone ?? getPreferredTimezone(),
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string, options?: DateFormatOptions): string {
  return new Intl.DateTimeFormat(options?.locale ?? getPreferredLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: options?.timeZone ?? getPreferredTimezone(),
  }).format(new Date(dateString))
}
