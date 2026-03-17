'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useForecast } from '@/lib/hooks/useForecast'
import type { ForecastPointDto } from '@/lib/api/endpoints/forecast'
import { formatDateTime } from '@/lib/utils/formatDate'

type ForecastMetric = 'revenue' | 'orders' | 'units'

const metricOptions: Array<{ label: string; value: ForecastMetric }> = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Orders', value: 'orders' },
  { label: 'Units', value: 'units' },
]

function formatAxisValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return value.toFixed(0)
}

function formatDayLabel(day: string): string {
  const parsed = new Date(`${day}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return day
  }

  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface ForecastLineChartProps {
  points: ForecastPointDto[]
  metric: ForecastMetric
}

function ForecastLineChart({ points, metric }: ForecastLineChartProps) {
  const chartWidth = 860
  const chartHeight = 280
  const padding = { top: 16, right: 16, bottom: 52, left: 56 }
  const graphWidth = chartWidth - padding.left - padding.right
  const graphHeight = chartHeight - padding.top - padding.bottom
  const values = points
    .map((point) => point[metric])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const maxValue = Math.max(...values, 0)
  const minValue = Math.min(...values, 0)
  const valueRange = maxValue - minValue || 1
  const yTickCount = 4
  const xStep = points.length > 1 ? graphWidth / (points.length - 1) : 0
  const lineColorClass = metric === 'revenue' ? 'stroke-black/70' : metric === 'orders' ? 'stroke-accent' : 'stroke-black/45'
  const pointColorClass = metric === 'revenue' ? 'fill-black/80' : metric === 'orders' ? 'fill-accent' : 'fill-black/55'

  const plottedPoints = points.map((point, index) => {
    const value = point[metric]
    const x = padding.left + xStep * index
    const y =
      typeof value === 'number' && Number.isFinite(value)
        ? padding.top + ((maxValue - value) / valueRange) * graphHeight
        : null
    return { day: point.day, value, x, y }
  })

  const linePath = plottedPoints.reduce<Array<string>>((segments, point, index) => {
    if (point.y === null) {
      return segments
    }

    const previous = plottedPoints[index - 1]
    if (!previous || previous.y === null) {
      segments.push(`M ${point.x} ${point.y}`)
      return segments
    }

    segments.push(`L ${point.x} ${point.y}`)
    return segments
  }, [])

  const xTickIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])).filter(
    (index) => index >= 0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full overflow-x-auto rounded-[12px] bg-black/5 p-3">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[280px] min-w-[720px] w-full" role="img" aria-label="Daily forecast chart">
          {Array.from({ length: yTickCount + 1 }, (_, idx) => {
            const ratio = idx / yTickCount
            const y = padding.top + ratio * graphHeight
            const tickValue = maxValue - ratio * valueRange
            return (
              <g key={`daily-y-${idx}`}>
                <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="stroke-black/10" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-text-secondary text-[11px]">
                  {formatAxisValue(tickValue)}
                </text>
              </g>
            )
          })}

          {linePath.length > 0 ? <path d={linePath.join(' ')} fill="none" className={lineColorClass} strokeWidth="2.5" /> : null}

          {plottedPoints.map((point) =>
            point.y !== null ? (
              <circle key={`${metric}-${point.day}`} cx={point.x} cy={point.y} r="3" className={pointColorClass} />
            ) : null,
          )}

          {xTickIndexes.map((index) => {
            const point = plottedPoints[index]
            if (!point) {
              return null
            }

            return (
              <text key={`daily-x-${point.day}`} x={point.x} y={chartHeight - 14} textAnchor="middle" className="fill-text-secondary text-[11px]">
                {formatDayLabel(point.day)}
              </text>
            )
          })}
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {plottedPoints.map((point) => (
          <div key={`${metric}-value-${point.day}`} className="rounded-[10px] bg-black/5 px-3 py-2">
            <p className="text-subhead text-text-primary">{formatDayLabel(point.day)}</p>
            <p className="text-body text-text-secondary">
              {typeof point.value === 'number' && Number.isFinite(point.value) ? point.value.toLocaleString() : 'No value'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useForecast(id)
  const forecast = data?.data
  const [selectedMetric, setSelectedMetric] = useState<ForecastMetric>('revenue')

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-48" />
      </div>
    )
  }

  if (isError || !forecast) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-body text-text-secondary">Forecast not found.</p>
        <Link href="/forecast" className="text-callout text-accent mt-2 block hover:underline">
          Back to Forecasts
        </Link>
      </div>
    )
  }

  const title = forecast.level === 'sku' ? 'SKU Forecast' : 'Workspace Forecast'
  const dailyForecastPoints = Array.isArray(forecast.forecast?.daily) ? forecast.forecast.daily : []
  const availableMetrics: ForecastMetric[] = metricOptions
    .map((option) => option.value)
    .filter((metric) => dailyForecastPoints.some((point) => typeof point[metric] === 'number' && Number.isFinite(point[metric])))
  const activeMetric = availableMetrics.includes(selectedMetric) ? selectedMetric : availableMetrics[0] ?? 'revenue'
  const hasDailyPoints = dailyForecastPoints.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/forecast" className="text-subhead text-text-secondary hover:text-text-primary transition-colors">
          Forecasts
        </Link>
        <span className="text-text-tertiary">/</span>
        <span className="text-subhead text-text-primary">{title}</span>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-title-1 text-text-primary">{title}</h1>
        <span className="text-caption-2 px-2.5 py-1 rounded-full bg-black/5 text-text-secondary">{forecast.level}</span>
      </div>

      <div className="glass-panel p-6">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-subhead text-text-secondary">Forecast ID</dt>
            <dd className="text-body text-text-primary mt-0.5 font-mono text-sm">{forecast.id}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Method</dt>
            <dd className="text-body text-text-primary mt-0.5">{forecast.method?.trim() ? forecast.method : 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Horizon</dt>
            <dd className="text-body text-text-primary mt-0.5">{forecast.horizonDays} days</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Range</dt>
            <dd className="text-body text-text-primary mt-0.5">
              {forecast.range.from} → {forecast.range.to}
            </dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Product ID</dt>
            <dd className="text-body text-text-primary mt-0.5">{forecast.productId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Created</dt>
            <dd className="text-body text-text-primary mt-0.5">{formatDateTime(forecast.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Updated</dt>
            <dd className="text-body text-text-primary mt-0.5">{formatDateTime(forecast.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="glass-panel p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title-3 text-text-primary">Daily Forecast</h2>
          <p className="text-body text-text-secondary">X-axis shows forecast day and Y-axis shows projected values.</p>
        </div>

        {!hasDailyPoints ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">No daily forecast points yet</p>
            <p className="text-body text-text-secondary">This forecast does not include daily breakdown data.</p>
          </div>
        ) : availableMetrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">No chartable metrics available</p>
            <p className="text-body text-text-secondary">Revenue, orders, and units are empty for these daily points.</p>
          </div>
        ) : (
          <>
            {availableMetrics.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {metricOptions
                  .filter((option) => availableMetrics.includes(option.value))
                  .map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedMetric(option.value)}
                      className={`rounded-[8px] px-3 py-1.5 text-subhead transition-all ${activeMetric === option.value ? 'bg-black/10 text-text-primary' : 'text-text-secondary hover:bg-black/5'}`}
                    >
                      {option.label}
                    </button>
                  ))}
              </div>
            ) : null}

            <ForecastLineChart points={dailyForecastPoints} metric={activeMetric} />
          </>
        )}
      </div>
    </div>
  )
}
