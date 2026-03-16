'use client'

import { useMemo, useState } from 'react'
import { useDashboardBreakdown } from '@/lib/hooks/useDashboard'

type BreakdownBy = 'channel' | 'country' | 'sku'
type RangeMode = '30d' | '90d' | 'custom'

const breakdownOptions: Array<{ value: BreakdownBy; label: string; description: string }> = [
  { value: 'channel', label: 'Channel', description: 'Revenue share by order channel.' },
  { value: 'country', label: 'Country', description: 'Revenue share by shipping country.' },
  { value: 'sku', label: 'SKU', description: 'Revenue share by SKU.' },
]

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRange(mode: RangeMode, customFrom: string, customTo: string) {
  if (mode === 'custom') {
    if (!customFrom || !customTo || customFrom > customTo) {
      return { from: null, to: null, isValid: false }
    }

    return { from: customFrom, to: customTo, isValid: true }
  }

  const toDate = new Date()
  const fromDate = new Date(toDate)
  const rangeDays = mode === '30d' ? 30 : 90
  fromDate.setDate(toDate.getDate() - rangeDays)

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate),
    isValid: true,
  }
}

function formatCurrency(value: string): string {
  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatShare(share: string): string {
  const numericShare = Number(share)
  if (Number.isNaN(numericShare)) {
    return '0.0%'
  }

  return `${numericShare.toFixed(1)}%`
}

function toBucketLabel(bucket: string): string {
  return bucket.toLowerCase() === 'unknown' ? 'Unknown' : bucket
}

export default function DashboardBreakdownPage() {
  const [by, setBy] = useState<BreakdownBy>('channel')
  const [rangeMode, setRangeMode] = useState<RangeMode>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const effectiveRange = useMemo(() => getDateRange(rangeMode, customFrom, customTo), [rangeMode, customFrom, customTo])

  const breakdownQuery = useDashboardBreakdown(
    {
      by,
      from: effectiveRange.from ?? undefined,
      to: effectiveRange.to ?? undefined,
    },
    effectiveRange.isValid,
  )

  const items = Array.isArray(breakdownQuery.data?.data?.items) ? breakdownQuery.data.data.items : []
  const hasItems = items.length > 0
  const activeOption = breakdownOptions.find((option) => option.value === by)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Breakdown</h1>
        <p className="text-body text-text-secondary mt-1">{activeOption?.description ?? 'Revenue share breakdown.'}</p>
      </div>

      <div className="glass-panel p-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {breakdownOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBy(option.value)}
              className={`rounded-[8px] px-3 py-1.5 text-subhead transition-all ${
                by === option.value ? 'bg-black/10 text-text-primary' : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRangeMode('30d')}
            className={`rounded-[8px] px-3 py-1.5 text-subhead transition-all ${rangeMode === '30d' ? 'bg-black/10 text-text-primary' : 'text-text-secondary hover:bg-black/5'}`}
          >
            30D
          </button>
          <button
            type="button"
            onClick={() => setRangeMode('90d')}
            className={`rounded-[8px] px-3 py-1.5 text-subhead transition-all ${rangeMode === '90d' ? 'bg-black/10 text-text-primary' : 'text-text-secondary hover:bg-black/5'}`}
          >
            90D
          </button>
          <button
            type="button"
            onClick={() => setRangeMode('custom')}
            className={`rounded-[8px] px-3 py-1.5 text-subhead transition-all ${rangeMode === 'custom' ? 'bg-black/10 text-text-primary' : 'text-text-secondary hover:bg-black/5'}`}
          >
            Custom
          </button>
        </div>

        {rangeMode === 'custom' ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-subhead text-text-secondary flex items-center gap-2">
              <span>From</span>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="glass-input text-text-primary"
              />
            </label>
            <label className="text-subhead text-text-secondary flex items-center gap-2">
              <span>To</span>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="glass-input text-text-primary"
              />
            </label>
            {!effectiveRange.isValid ? <p className="text-footnote text-destructive">Choose a valid date range.</p> : null}
          </div>
        ) : null}
      </div>

      {breakdownQuery.isError ? (
        <div className="glass-panel p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-subhead text-text-primary">We couldn&apos;t refresh breakdown data right now.</p>
            <p className="text-body text-text-secondary">Try again in a moment. Any previously loaded items are shown below.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void breakdownQuery.refetch()
            }}
            className="rounded-[10px] bg-black/10 px-4 py-2 text-subhead text-text-primary transition-all hover:bg-black/15"
          >
            {breakdownQuery.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      <div className="glass-panel p-6">
        {breakdownQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`breakdown-skeleton-${index}`} className="skeleton h-12" />
            ))}
          </div>
        ) : !effectiveRange.isValid ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">Choose a valid date range to load breakdown</p>
            <p className="text-body text-text-secondary">Once the range is valid, revenue share buckets appear automatically.</p>
          </div>
        ) : !hasItems ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">No breakdown data yet</p>
            <p className="text-body text-text-secondary">We couldn&apos;t find any revenue share buckets for this selection.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-subhead text-text-secondary">
              {items.length} buckets loaded{breakdownQuery.isFetching ? ' • refreshing...' : '.'}
            </p>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={`${item.key}-${item.value}`} className="rounded-[12px] bg-black/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-subhead text-text-primary">{toBucketLabel(item.key)}</p>
                    <p className="text-body text-text-secondary">{formatCurrency(item.value)}</p>
                  </div>
                  <p className="text-footnote text-text-secondary mt-1">Revenue share: {formatShare(item.share)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
