'use client'

import { useMemo, useState } from 'react'
import type { DashboardRepeatPurchaseGroupBy } from '@/lib/api/endpoints/dashboard'
import { useDashboardRepeatPurchase } from '@/lib/hooks/useDashboard'

type RangeMode = '30d' | '90d' | 'custom'

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

export default function DashboardRepeatPurchasePage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [groupBy, setGroupBy] = useState<DashboardRepeatPurchaseGroupBy>('day')

  const effectiveRange = useMemo(() => getDateRange(rangeMode, customFrom, customTo), [rangeMode, customFrom, customTo])

  const repeatPurchaseQuery = useDashboardRepeatPurchase(
    {
      from: effectiveRange.from ?? undefined,
      to: effectiveRange.to ?? undefined,
      groupBy,
    },
    effectiveRange.isValid,
  )

  const payload = repeatPurchaseQuery.data?.data
  const points = Array.isArray(payload?.points) ? payload.points : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Repeat Purchase</h1>
        <p className="mt-1 text-body text-text-secondary">Monitor new versus repeat customers over time.</p>
      </div>

      <div className="glass-panel flex flex-col gap-4 p-4">
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
            <label className="flex items-center gap-2 text-subhead text-text-secondary">
              <span>From</span>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="glass-input text-text-primary"
              />
            </label>
            <label className="flex items-center gap-2 text-subhead text-text-secondary">
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

        <div className="flex items-center gap-2">
          <span className="text-subhead text-text-secondary">Group by</span>
          <select
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as DashboardRepeatPurchaseGroupBy)}
            className="glass-input text-text-primary"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </div>
      </div>

      <div className="glass-panel p-6">
        {repeatPurchaseQuery.isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`repeat-purchase-kpi-skeleton-${index}`} className="skeleton h-20" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`repeat-purchase-row-skeleton-${index}`} className="skeleton h-12" />
            ))}
          </div>
        ) : !effectiveRange.isValid ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">Choose a valid date range</p>
            <p className="text-body text-text-secondary">Once your range is valid, repeat purchase metrics load automatically.</p>
          </div>
        ) : repeatPurchaseQuery.isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">Failed to load repeat purchase data</p>
            <button
              type="button"
              onClick={() => void repeatPurchaseQuery.refetch()}
              className="rounded-[8px] bg-black/10 px-3 py-2 text-subhead text-text-primary transition-all hover:bg-black/20"
            >
              Retry
            </button>
          </div>
        ) : !payload || payload.totalCustomers === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-black/5 px-6 py-12 text-center">
            <p className="text-subhead text-text-primary">No customer purchase data yet</p>
            <p className="text-body text-text-secondary">Try a wider range to include more orders.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-[10px] bg-black/5 p-3">
                <p className="text-footnote text-text-secondary">Repeat Purchase Rate</p>
                <p className="text-title-3 text-text-primary">{formatPercent(payload.repeatPurchaseRatePercent)}</p>
              </div>
              <div className="rounded-[10px] bg-black/5 p-3">
                <p className="text-footnote text-text-secondary">Repeat Customers</p>
                <p className="text-title-3 text-text-primary">{payload.repeatCustomers}</p>
              </div>
              <div className="rounded-[10px] bg-black/5 p-3">
                <p className="text-footnote text-text-secondary">New Customers</p>
                <p className="text-title-3 text-text-primary">{payload.newCustomers}</p>
              </div>
              <div className="rounded-[10px] bg-black/5 p-3">
                <p className="text-footnote text-text-secondary">Total Customers</p>
                <p className="text-title-3 text-text-primary">{payload.totalCustomers}</p>
              </div>
            </div>

            {points.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-footnote text-text-secondary">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Repeat Rate</th>
                      <th className="py-2 pr-3">Repeat Customers</th>
                      <th className="py-2 pr-3">New Customers</th>
                      <th className="py-2">Total Customers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.date} className="border-b border-black/5 text-subhead text-text-primary">
                        <td className="py-3 pr-3">{point.date}</td>
                        <td className="py-3 pr-3">{formatPercent(point.repeatPurchaseRatePercent)}</td>
                        <td className="py-3 pr-3">{point.repeatCustomers}</td>
                        <td className="py-3 pr-3">{point.newCustomers}</td>
                        <td className="py-3">{point.totalCustomers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
