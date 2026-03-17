'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useForecast } from '@/lib/hooks/useForecast'
import { formatDateTime } from '@/lib/utils/formatDate'

export default function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useForecast(id)
  const forecast = data?.data

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
            <dd className="text-body text-text-primary mt-0.5">{forecast.method}</dd>
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
    </div>
  )
}
