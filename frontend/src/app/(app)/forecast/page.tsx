'use client'
import Link from 'next/link'
import { useForecasts } from '@/lib/hooks/useForecast'
import { formatDate } from '@/lib/utils/formatDate'

export default function ForecastPage() {
  const { data, isLoading } = useForecasts()
  const forecasts = data?.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary">Forecasts</h1>
          <p className="text-body text-text-secondary mt-1">Demand forecasting for your inventory.</p>
        </div>
        <Link
          href="/forecast/create"
          className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover active:scale-[0.98] transition-all duration-200"
        >
          New Forecast
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : forecasts.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No forecasts yet.</p>
          <Link href="/forecast/create" className="text-callout text-accent mt-2 block hover:underline">
            Create your first forecast
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {forecasts.map((forecast) => (
            <Link key={forecast.id} href={`/forecast/${forecast.id}`}>
              <div className="glass-card p-5 flex items-center justify-between">
                <div>
                  <p className="text-headline text-text-primary">{forecast.level === 'SKU' ? 'SKU Forecast' : 'Workspace Forecast'}</p>
                  <p className="text-footnote text-text-tertiary mt-0.5">
                    {forecast.method} • {forecast.horizonDays} day horizon
                  </p>
                  <p className="text-footnote text-text-tertiary mt-0.5">{formatDate(forecast.createdAt)}</p>
                </div>
                <span className="text-caption-2 px-2.5 py-1 rounded-full bg-black/5 text-text-secondary">
                  {forecast.level}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
