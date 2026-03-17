import { getPreferredCurrency, getPreferredLocale } from '@/lib/store/preferencesStore'

export function formatCurrency(amount: number, currency?: string, locale?: string): string {
  return new Intl.NumberFormat(locale ?? getPreferredLocale(), {
    style: 'currency',
    currency: currency ?? getPreferredCurrency(),
    minimumFractionDigits: 2,
  }).format(amount)
}
