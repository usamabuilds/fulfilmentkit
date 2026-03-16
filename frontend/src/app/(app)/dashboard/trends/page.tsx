'use client'

import { useMemo, useState } from 'react'
import { useDashboardTrends } from '@/lib/hooks/useDashboard'

type TrendMetric = 'revenue' | 'orders' | 'margin' | 'refunds' | 'fees'
type TrendGrouping = 'day' | 'week'
type RangeMode = '7d' | '30d' | '90d' | 'custom'

const metricOptions: Array<{ label: string; value: TrendMetric }> = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Orders', value: 'orders' },
  { label: 'Margin', value: 'margin' },
  { label: 'Refunds', value: 'refunds' },
  { label: 'Fees', value: 'fees' },
]

const groupingOptions: Array<{ label: string; value: TrendGrouping }> = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
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

  const rangeDays = mode === '7d' ? 7 : mode === '30d' ? 30 : 90
  fromDate.setDate(toDate.getDate() - rangeDays)

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate),
    isValid: true,
  }
}

export default function DashboardTrendsPage() {
  const [metric, setMetric] = useState<TrendMetric>('revenue')
  const [groupBy, setGroupBy] = useState<TrendGrouping>('day')
  const [rangeMode, setRangeMode] = useState<RangeMode>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const effectiveRange = useMemo(
    () => getDateRange(rangeMode, customFrom, customTo),
    [rangeMode, customFrom, customTo],
  )

  const queryParams = useMemo(
    () => ({
      metric,
      groupBy,
      from: effectiveRange.from ?? undefined,
      to: effectiveRange.to ?? undefined,
    }),
    [metric, groupBy, effectiveRange.from, effectiveRange.to],
  )

  const { data, isLoading, isFetching } = useDashboardTrends(queryParams, effectiveRange.isValid)
  const trendPoints = data?.data?.points ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Trends</h1>
        <p className="text-body text-text-secondary mt-1">Revenue and order trends over time.</p>
      </div>

      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-subhead text-text-secondary flex flex-col gap-2">
            <span>Metric</span>
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as TrendMetric)}
              className="glass-input text-text-primary"
            >
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-subhead text-text-secondary flex flex-col gap-2">
            <span>Grouping</span>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as TrendGrouping)}
              className="glass-input text-text-primary"
            >
              {groupingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRangeMode('7d')}
            className={`rounded-[8px] px-3 py-1.5 text-subhead transition-all ${rangeMode === '7d' ? 'bg-black/10 text-text-primary' : 'text-text-secondary hover:bg-black/5'}`}
          >
            7D
          </button>
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
            {!effectiveRange.isValid ? (
              <p className="text-footnote text-destructive">Choose a valid date range.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="glass-panel p-6">
        {isLoading || isFetching ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-32 w-full" />
          </div>
        ) : trendPoints.length === 0 ? (
          <p className="text-body text-text-secondary">No trend data available for this selection.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-subhead text-text-secondary">{trendPoints.length} points loaded.</p>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {trendPoints.map((point) => (
                <li key={`${point.date}-${String(point.value)}`} className="rounded-[10px] bg-black/5 px-3 py-2">
                  <p className="text-subhead text-text-primary">{point.date}</p>
                  <p className="text-body text-text-secondary">{point.value}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
