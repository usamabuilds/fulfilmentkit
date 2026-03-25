'use client'

import { useMemo, useState } from 'react'
import type { DashboardTopSkuSortBy } from '@/lib/api/endpoints/dashboard'
import { useDashboardTopSkus } from '@/lib/hooks/useDashboard'
import { formatCurrency } from '@/lib/utils/formatCurrency'

type RangeMode = '30d' | '90d' | 'custom'

const sortOptions: Array<{ value: DashboardTopSkuSortBy; label: string }> = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'units', label: 'Units' },
  { value: 'refunds', label: 'Refunds' },
  { value: 'margin', label: 'Margin' },
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

function formatPercent(value: string): string {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return '0.00%'
  return `${numeric.toFixed(2)}%`
}

export default function DashboardTopSkusPage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sortBy, setSortBy] = useState<DashboardTopSkuSortBy>('revenue')
  const [limit, setLimit] = useState(25)

  const effectiveRange = useMemo(() => getDateRange(rangeMode, customFrom, customTo), [rangeMode, customFrom, customTo])

  const topSkusQuery = useDashboardTopSkus(
    {
      from: effectiveRange.from ?? undefined,
      to: effectiveRange.to ?? undefined,
      limit,
      sortBy,
    },
    effectiveRange.isValid,
  )

  const rows = Array.isArray(topSkusQuery.data?.data?.rows) ? topSkusQuery.data.data.rows : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Top SKU Performance</h1>
        <p className="text-body text-text-secondary mt-1">Purpose-built SKU ranking by revenue, units, refunds, or margin.</p>
      </div>

      <div className="glass-panel p-4 flex flex-col gap-4">
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

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-subhead text-text-secondary flex items-center gap-2">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as DashboardTopSkuSortBy)}
              className="glass-input text-text-primary"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-subhead text-text-secondary flex items-center gap-2">
            <span>Limit</span>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                if (!Number.isFinite(parsed)) return
                setLimit(Math.max(1, Math.min(100, Math.floor(parsed))))
              }}
              className="glass-input w-24 text-text-primary"
            />
          </label>
        </div>
      </div>

      <div className="glass-panel p-6">
        {topSkusQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`top-sku-skeleton-${index}`} className="skeleton h-12" />
            ))}
          </div>
        ) : !effectiveRange.isValid ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">Choose a valid date range to load SKUs</p>
            <p className="text-body text-text-secondary">Once the range is valid, ranked SKU performance appears automatically.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">No SKU data yet</p>
            <p className="text-body text-text-secondary">We couldn&apos;t find SKU performance data for this selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-auto border-collapse">
              <thead>
                <tr className="border-b border-black/10 text-left text-footnote text-text-secondary">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Revenue</th>
                  <th className="py-2 pr-3">Units</th>
                  <th className="py-2 pr-3">Refunds</th>
                  <th className="py-2 pr-3">Fees</th>
                  <th className="py-2 pr-3">Margin</th>
                  <th className="py-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.sku}-${row.name}`} className="border-b border-black/5 text-subhead text-text-primary">
                    <td className="py-3 pr-3">{row.sku}</td>
                    <td className="py-3 pr-3">{row.name}</td>
                    <td className="py-3 pr-3">{formatCurrency(Number(row.revenue))}</td>
                    <td className="py-3 pr-3">{row.units}</td>
                    <td className="py-3 pr-3">{formatCurrency(Number(row.refunds))}</td>
                    <td className="py-3 pr-3">{formatCurrency(Number(row.fees))}</td>
                    <td className="py-3 pr-3">{formatCurrency(Number(row.margin))}</td>
                    <td className="py-3">{formatPercent(row.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
