'use client'

import { useMemo, useState } from 'react'
import { useDashboardTrends } from '@/lib/hooks/useDashboard'

type TrendMetric = 'revenue' | 'orders' | 'margin' | 'refunds' | 'fees'
type TrendGrouping = 'day' | 'week'
type RangeMode = '7d' | '30d' | '90d' | 'custom'
type NormalizedTrendPoint = {
  date: string
  value: number
}

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

function formatTickLabel(dateValue: string, grouping: TrendGrouping): string {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  if (grouping === 'week') {
    return `Wk of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatAxisValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return value.toFixed(0)
}

interface TrendsLineChartProps {
  points: NormalizedTrendPoint[]
  groupBy: TrendGrouping
}

function TrendsLineChart({ points, groupBy }: TrendsLineChartProps) {
  const chartWidth = 860
  const chartHeight = 280
  const padding = { top: 16, right: 16, bottom: 52, left: 56 }
  const graphWidth = chartWidth - padding.left - padding.right
  const graphHeight = chartHeight - padding.top - padding.bottom
  const maxValue = Math.max(...points.map((point) => point.value), 0)
  const minValue = Math.min(...points.map((point) => point.value), 0)
  const valueRange = maxValue - minValue || 1
  const yTickCount = 4
  const xStep = points.length > 1 ? graphWidth / (points.length - 1) : 0

  const plottedPoints = points.map((point, index) => {
    const x = padding.left + xStep * index
    const y = padding.top + ((maxValue - point.value) / valueRange) * graphHeight
    return { ...point, x, y }
  })

  const polyline = plottedPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const xTickIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])).filter(
    (index) => index >= 0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full overflow-x-auto rounded-[12px] bg-black/5 p-3">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-[280px] min-w-[720px] w-full"
          role="img"
          aria-label="Trend chart"
        >
          {Array.from({ length: yTickCount + 1 }, (_, idx) => {
            const ratio = idx / yTickCount
            const y = padding.top + ratio * graphHeight
            const tickValue = maxValue - ratio * valueRange
            return (
              <g key={`y-${idx}`}>
                <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="stroke-black/10" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-text-secondary text-[11px]">
                  {formatAxisValue(tickValue)}
                </text>
              </g>
            )
          })}

          {polyline ? <polyline points={polyline} fill="none" className="stroke-black/60" strokeWidth="2.5" /> : null}

          {plottedPoints.map((point) => (
            <circle key={`${point.date}-${point.value}`} cx={point.x} cy={point.y} r="3" className="fill-black/70" />
          ))}

          {xTickIndexes.map((index) => {
            const point = plottedPoints[index]
            if (!point) {
              return null
            }

            return (
              <text key={`x-${point.date}`} x={point.x} y={chartHeight - 14} textAnchor="middle" className="fill-text-secondary text-[11px]">
                {formatTickLabel(point.date, groupBy)}
              </text>
            )
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {points.map((point) => (
          <div key={`${point.date}-${point.value}`} className="rounded-[10px] bg-black/5 px-3 py-2">
            <p className="text-subhead text-text-primary">{formatTickLabel(point.date, groupBy)}</p>
            <p className="text-body text-text-secondary">{point.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
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

  const { data, isLoading, isFetching, isError, refetch } = useDashboardTrends(queryParams, effectiveRange.isValid)
  const trendPoints = Array.isArray(data?.data?.points) ? data.data.points : []
  const normalizedTrendPoints = useMemo<NormalizedTrendPoint[]>(
    () =>
      trendPoints
        .map((point) => ({
          date: point.date,
          value: typeof point.value === 'number' ? point.value : Number.parseFloat(point.value),
        }))
        .filter((point) => Number.isFinite(point.value)),
    [trendPoints],
  )
  const hasLoadedResponse = Boolean(data)
  const isInitialLoading = isLoading && !hasLoadedResponse
  const hasTrendPoints = normalizedTrendPoints.length > 0
  const showEmptyState = hasLoadedResponse && !isError && !hasTrendPoints

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

      {isError ? (
        <div className="glass-panel p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-subhead text-text-primary">We couldn&apos;t refresh trends right now.</p>
            <p className="text-body text-text-secondary">Showing any previously loaded data below. Try again in a moment.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refetch()
            }}
            className="rounded-[10px] bg-black/10 px-4 py-2 text-subhead text-text-primary transition-all hover:bg-black/15"
          >
            {isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      <div className="glass-panel p-6">
        {isInitialLoading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-32 w-full" />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`trends-point-skeleton-${index}`} className="skeleton h-14" />
              ))}
            </div>
          </div>
        ) : showEmptyState ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">No trend points yet</p>
            <p className="text-body text-text-secondary">
              We couldn&apos;t find any data points for this selection. Try a different metric or date range.
            </p>
          </div>
        ) : hasTrendPoints ? (
          <div className="flex flex-col gap-3">
            <p className="text-subhead text-text-secondary">
              {normalizedTrendPoints.length} points loaded{isFetching ? ' • refreshing...' : '.'}
            </p>
            <TrendsLineChart points={normalizedTrendPoints} groupBy={groupBy} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">Choose a valid date range to load trends</p>
            <p className="text-body text-text-secondary">Once the range is valid, trends will appear automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}
