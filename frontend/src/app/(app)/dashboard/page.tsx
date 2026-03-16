'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RecentOrdersTable } from '@/components/modules/dashboard/RecentOrdersTable'
import { StatCard } from '@/components/modules/dashboard/StatCard'
import { useDashboardStats } from '@/lib/hooks/useDashboard'
import { useOrders } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/formatCurrency'

type RangeMode = '7d' | '30d' | '90d' | 'custom'

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

  const rangeDays =
    mode === '7d'
      ? 7
      : mode === '30d'
        ? 30
        : 90

  fromDate.setDate(toDate.getDate() - rangeDays)

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate),
    isValid: true,
  }
}

function formatPercent(value: string | number): string {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return '0.00%'
  }

  return `${numericValue.toFixed(2)}%`
}

export default function DashboardPage() {
  const [rangeMode, setRangeMode] = useState<RangeMode>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const effectiveRange = useMemo(
    () => getDateRange(rangeMode, customFrom, customTo),
    [rangeMode, customFrom, customTo],
  )

  const rangeParams = useMemo(
    () =>
      effectiveRange.isValid && effectiveRange.from && effectiveRange.to
        ? { from: effectiveRange.from, to: effectiveRange.to }
        : undefined,
    [effectiveRange],
  )

  const { data: statsData, isLoading: statsLoading } = useDashboardStats(rangeParams, effectiveRange.isValid)
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ pageSize: 5 })

  const stats = statsData?.data
  const orders = ordersData?.data?.items ?? []
  const kpiValues: Array<number | string | null | undefined> = [
    stats?.revenue,
    stats?.orders,
    stats?.units,
    stats?.refundsAmount,
    stats?.feesAmount,
    stats?.grossMarginAmount,
    stats?.grossMarginPercent,
    stats?.stockoutsCount,
    stats?.lowStockCount,
  ]
  const hasSummaryPayload = stats !== null && stats !== undefined
  const allKpisUnavailable = kpiValues.every((value) => value === null || value === undefined || value === '')
  const isStatsReady = hasSummaryPayload && !allKpisUnavailable

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Dashboard</h1>
        <p className="text-body text-text-secondary mt-1">Your fulfilment overview.</p>
      </div>

      <div className="glass-panel p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
                onChange={(e) => setCustomFrom(e.target.value)}
                className="glass-input text-text-primary"
              />
            </label>
            <label className="text-subhead text-text-secondary flex items-center gap-2">
              <span>To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="glass-input text-text-primary"
              />
            </label>
            {!effectiveRange.isValid ? (
              <p className="text-footnote text-destructive">Choose a valid date range.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={`dashboard-stat-skeleton-${index}`} className="skeleton h-24" />
          ))}
        </div>
      ) : !isStatsReady ? (
        <div className="glass-panel p-6 flex flex-col gap-3">
          <h2 className="text-title-3 text-text-primary">No metrics yet</h2>
          <p className="text-body text-text-secondary max-w-3xl">
            Dashboard KPIs are not ready yet. Run metrics compute to generate your summary, or sync data first and come back in a moment.
          </p>
          <div>
            <Link
              href="/metrics/compute"
              className="inline-flex rounded-[10px] bg-black/10 px-4 py-2 text-subhead text-text-primary transition-all hover:bg-black/15"
            >
              Go to Metrics Compute
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Revenue"
            value={formatCurrency(Number(stats?.revenue ?? '0'))}
            accent="success"
          />
          <StatCard label="Orders" value={stats?.orders ?? 0} />
          <StatCard label="Units" value={stats?.units ?? 0} accent="warning" />
          <StatCard
            label="Refunds Amount"
            value={formatCurrency(Number(stats?.refundsAmount ?? '0'))}
          />
          <StatCard
            label="Fees Amount"
            value={formatCurrency(Number(stats?.feesAmount ?? '0'))}
          />
          <StatCard
            label="Gross Margin Amount"
            value={formatCurrency(Number(stats?.grossMarginAmount ?? '0'))}
          />
          <StatCard
            label="Gross Margin Percent"
            value={formatPercent(stats?.grossMarginPercent ?? '0')}
          />
          <StatCard
            label="Stockouts Count"
            value={stats?.stockoutsCount ?? 0}
            accent={stats?.stockoutsCount ? 'destructive' : 'default'}
          />
          <StatCard
            label="Low Stock Count"
            value={stats?.lowStockCount ?? 0}
            accent={stats?.lowStockCount ? 'destructive' : 'default'}
          />
        </div>
      )}

      <div>
        <h2 className="text-title-3 text-text-primary mb-3">Recent Orders</h2>
        {ordersLoading ? <div className="skeleton h-48" /> : <RecentOrdersTable orders={orders} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5 min-h-40">
          <h2 className="text-title-3 text-text-primary mb-2">Trends</h2>
          <p className="text-body text-text-secondary">Trends visualizations coming soon.</p>
        </div>
        <div className="glass-panel p-5 min-h-40">
          <h2 className="text-title-3 text-text-primary mb-2">Alerts</h2>
          <p className="text-body text-text-secondary">Operational alerts will appear here.</p>
        </div>
      </div>
    </div>
  )
}
