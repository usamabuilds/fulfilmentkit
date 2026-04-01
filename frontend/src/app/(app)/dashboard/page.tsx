'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RecentOrdersTable } from '@/components/modules/dashboard/RecentOrdersTable'
import { StatCard } from '@/components/modules/dashboard/StatCard'
import type { DashboardAlert, DashboardAlertLevel } from '@/lib/api/endpoints/dashboard'
import type { ReportDefinitionDto } from '@/lib/api/endpoints/reports'
import { useDashboardAlerts, useDashboardSnapshotReportRun, useDashboardSnapshotReports, useDashboardStats } from '@/lib/hooks/useDashboard'
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

function getAlertLevelClasses(level: DashboardAlertLevel): string {
  if (level === 'critical') {
    return 'bg-red-500/15 text-red-200 border border-red-400/40'
  }

  if (level === 'warning') {
    return 'bg-amber-500/15 text-amber-200 border border-amber-400/40'
  }

  return 'bg-sky-500/15 text-sky-200 border border-sky-400/40'
}

function getAlertLevelPriority(level: DashboardAlertLevel): number {
  if (level === 'critical') {
    return 0
  }

  if (level === 'warning') {
    return 1
  }

  return 2
}

function getTypeLabel(type: DashboardAlert['type']): string | null {
  if (type === 'refund_spikes') {
    return 'Refund Spike'
  }

  return null
}

type WidgetSupportStatus = 'supported' | 'partial' | 'unsupported'

function getDashboardDateRangeFilter(rangeMode: RangeMode): string | null {
  if (rangeMode === '7d') {
    return 'last_7_days'
  }
  if (rangeMode === '30d') {
    return 'last_30_days'
  }
  if (rangeMode === '90d') {
    return 'last_90_days'
  }

  return null
}

function buildSnapshotFilters(
  report: ReportDefinitionDto | null,
  rangeMode: RangeMode,
  effectiveRange: { from: string | null; to: string | null; isValid: boolean },
): Record<string, string | number | string[]> | undefined {
  if (!report) {
    return undefined
  }

  const baseFilters: Record<string, string | number | string[]> = { ...report.defaultFilters }
  const dateRangePreset = getDashboardDateRangeFilter(rangeMode)
  const hasDateRangeField = 'dateRange' in report.filterDefinitions
  if (dateRangePreset && hasDateRangeField) {
    baseFilters.dateRange = dateRangePreset
  }

  if (rangeMode === 'custom' && effectiveRange.isValid && effectiveRange.from && effectiveRange.to) {
    if (hasDateRangeField) {
      baseFilters.dateRange = 'custom'
    }
    baseFilters.from = effectiveRange.from
    baseFilters.to = effectiveRange.to
  }

  return baseFilters
}

function getSupportBadgeClassName(status: WidgetSupportStatus): string {
  if (status === 'supported') {
    return 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
  }
  if (status === 'partial') {
    return 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
  }

  return 'bg-rose-500/15 text-rose-200 border border-rose-400/30'
}

function getSupportLabel(status: WidgetSupportStatus): string {
  if (status === 'supported') {
    return 'Supported'
  }
  if (status === 'partial') {
    return 'Partial'
  }

  return 'Unsupported'
}

function getBarHeightClass(value: number, maxValue: number): string {
  const ratio = maxValue === 0 ? 0 : value / maxValue
  if (ratio >= 0.85) return 'h-16'
  if (ratio >= 0.7) return 'h-14'
  if (ratio >= 0.55) return 'h-12'
  if (ratio >= 0.4) return 'h-10'
  if (ratio >= 0.25) return 'h-8'
  return 'h-6'
}

function renderTinyBars(values: number[], barClassName: string): JSX.Element {
  const maxValue = values.length > 0 ? Math.max(...values, 1) : 1
  return (
    <div className="mt-3 flex h-16 items-end gap-1.5">
      {values.map((value, index) => {
        const barHeightClass = getBarHeightClass(value, maxValue)
        return (
          <div key={`dashboard-widget-bar-${index}`} className="flex-1">
            <div className={`w-full rounded-[6px] ${barClassName} ${barHeightClass}`} />
          </div>
        )
      })}
    </div>
  )
}

interface SnapshotCardProps {
  title: string
  subtitle: string
  reportDefinition: ReportDefinitionDto | null
  isLoading: boolean
  isError: boolean
  unsupportedReason: string | null
  partialCaveat: string | null
  renderContent: () => JSX.Element
}

function SnapshotCard(props: SnapshotCardProps) {
  const status: WidgetSupportStatus = props.reportDefinition?.supportStatus ?? 'unsupported'
  const reason = props.unsupportedReason ?? props.reportDefinition?.supportReason ?? null

  return (
    <div className="glass-panel p-5 min-h-52">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title-3 text-text-primary">{props.title}</h3>
          <p className="mt-1 text-footnote text-text-secondary">{props.subtitle}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-caption-2 uppercase tracking-wide ${getSupportBadgeClassName(status)}`}>
          {getSupportLabel(status)}
        </span>
      </div>

      {status === 'unsupported' ? (
        <div className="rounded-[12px] border border-rose-400/35 bg-rose-500/10 p-4 text-footnote text-rose-100">
          <p className="font-medium">Unsupported for this workspace.</p>
          <p className="mt-1">{reason ?? 'This widget is currently unavailable due to platform/report limitations.'}</p>
        </div>
      ) : props.isLoading ? (
        <div className="skeleton h-28" />
      ) : props.isError ? (
        <p className="text-footnote text-destructive">Failed to load widget data.</p>
      ) : (
        <>
          {props.renderContent()}
          {status !== 'supported' && props.partialCaveat ? (
            <p className="mt-3 text-footnote text-amber-200">{props.partialCaveat}</p>
          ) : null}
        </>
      )}
    </div>
  )
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
  const reportsEnabled = effectiveRange.isValid

  const { data: statsData, isLoading: statsLoading } = useDashboardStats(rangeParams, effectiveRange.isValid)
  const { data: alertsData, isLoading: alertsLoading } = useDashboardAlerts(rangeParams, effectiveRange.isValid)
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ pageSize: 5 })
  const snapshotReports = useDashboardSnapshotReports(reportsEnabled)

  const stats = statsData?.data
  const orders = ordersData?.data?.items ?? []
  const kpiValues: Array<number | string | null | undefined> = [
    stats?.revenue,
    stats?.orders,
    stats?.units,
    stats?.refundsAmount,
    stats?.refundRatePercent,
    stats?.feesAmount,
    stats?.grossMarginAmount,
    stats?.grossMarginPercent,
    stats?.stockoutsCount,
    stats?.lowStockCount,
  ]
  const hasSummaryPayload = stats !== null && stats !== undefined
  const allKpisUnavailable = kpiValues.every((value) => value === null || value === undefined || value === '')
  const isStatsReady = hasSummaryPayload && !allKpisUnavailable
  const prioritizedAlerts = useMemo(() => {
    const alerts = alertsData?.data?.alerts ?? []
    return [...alerts]
      .sort((a, b) => getAlertLevelPriority(a.level) - getAlertLevelPriority(b.level))
      .slice(0, 3)
  }, [alertsData])
  const snapshotDefinitions = useMemo(() => {
    const items = snapshotReports.data?.data.items ?? []
    return {
      ordersOverTime: items.find((report) => report.key === 'orders-over-time') ?? null,
      shipping: items.find((report) => report.key === 'shipping-delivery-performance') ?? null,
      fulfilled: items.find((report) => report.key === 'orders-fulfilled-over-time') ?? null,
      reversals: items.find((report) => report.key === 'orders-reversals-by-product') ?? null,
    }
  }, [snapshotReports.data?.data.items])

  const snapshotFilters = useMemo(
    () => ({
      ordersOverTime: buildSnapshotFilters(snapshotDefinitions.ordersOverTime, rangeMode, effectiveRange),
      shipping: buildSnapshotFilters(snapshotDefinitions.shipping, rangeMode, effectiveRange),
      fulfilled: buildSnapshotFilters(snapshotDefinitions.fulfilled, rangeMode, effectiveRange),
      reversals: buildSnapshotFilters(snapshotDefinitions.reversals, rangeMode, effectiveRange),
    }),
    [effectiveRange, rangeMode, snapshotDefinitions],
  )

  const ordersOverTimeQuery = useDashboardSnapshotReportRun({
    reportKey: 'orders-over-time',
    filters: snapshotFilters.ordersOverTime,
    enabled: reportsEnabled,
  })
  const shippingQuery = useDashboardSnapshotReportRun({
    reportKey: 'shipping-delivery-performance',
    filters: snapshotFilters.shipping,
    enabled: reportsEnabled,
  })
  const fulfilledQuery = useDashboardSnapshotReportRun({
    reportKey: 'orders-fulfilled-over-time',
    filters: snapshotFilters.fulfilled,
    enabled: reportsEnabled,
  })
  const reversalsQuery = useDashboardSnapshotReportRun({
    reportKey: 'orders-reversals-by-product',
    filters: snapshotFilters.reversals,
    enabled: reportsEnabled,
  })

  const ordersOverTimeRows = (ordersOverTimeQuery.runData?.output.chartRows ?? []) as Array<{ date: string; orderCount: number }>
  const shippingRows = (shippingQuery.runData?.output.chartRows ?? []) as Array<{
    date: string
    onTimeDeliveries: number
    lateDeliveries: number
  }>
  const fulfilledRows = (fulfilledQuery.runData?.output.chartRows ?? []) as Array<{ date: string; fulfilledOrderCount: number }>
  const reversalsRows = (reversalsQuery.runData?.output.chartRows ?? []) as Array<{ productName: string; reversalCount: number }>

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
          {Array.from({ length: 10 }).map((_, index) => (
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
            label="Refund Rate"
            value={formatPercent(stats?.refundRatePercent ?? '0')}
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

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-title-3 text-text-primary">Orders Reporting Snapshot</h2>
          <p className="mt-1 text-body text-text-secondary">Operational report widgets aligned to the selected dashboard date range.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <SnapshotCard
            title="Orders Over Time"
            subtitle="Recent order volume trajectory."
            reportDefinition={ordersOverTimeQuery.reportDefinition}
            isLoading={ordersOverTimeQuery.runQuery.isLoading}
            isError={ordersOverTimeQuery.runQuery.isError}
            unsupportedReason={ordersOverTimeQuery.runData?.output.supportReason ?? null}
            partialCaveat={ordersOverTimeQuery.runData?.output.caveat ?? null}
            renderContent={() => (
              <>
                <p className="text-subhead text-text-primary">
                  Total Orders:{' '}
                  <span className="text-title-3">
                    {ordersOverTimeRows.reduce((total, row) => total + row.orderCount, 0)}
                  </span>
                </p>
                {renderTinyBars(ordersOverTimeRows.slice(-10).map((row) => row.orderCount), 'bg-cyan-300/60')}
              </>
            )}
          />

          <SnapshotCard
            title="Shipping Delivery Performance"
            subtitle="Median delivery signal and on-time trend."
            reportDefinition={shippingQuery.reportDefinition}
            isLoading={shippingQuery.runQuery.isLoading}
            isError={shippingQuery.runQuery.isError}
            unsupportedReason={shippingQuery.runData?.output.supportReason ?? null}
            partialCaveat={shippingQuery.runData?.output.caveat ?? null}
            renderContent={() => {
              const totalDeliveries = shippingRows.reduce((sum, row) => sum + row.onTimeDeliveries + row.lateDeliveries, 0)
              const totalLate = shippingRows.reduce((sum, row) => sum + row.lateDeliveries, 0)
              const onTimeRate = totalDeliveries === 0 ? 0 : ((totalDeliveries - totalLate) / totalDeliveries) * 100

              return (
                <>
                  <p className="text-subhead text-text-primary">
                    On-time Rate: <span className="text-title-3">{onTimeRate.toFixed(1)}%</span>
                  </p>
                  {renderTinyBars(shippingRows.slice(-10).map((row) => row.onTimeDeliveries), 'bg-emerald-300/60')}
                </>
              )
            }}
          />

          <SnapshotCard
            title="Fulfilled Orders Trend"
            subtitle="Fulfilment throughput over time."
            reportDefinition={fulfilledQuery.reportDefinition}
            isLoading={fulfilledQuery.runQuery.isLoading}
            isError={fulfilledQuery.runQuery.isError}
            unsupportedReason={fulfilledQuery.runData?.output.supportReason ?? null}
            partialCaveat={fulfilledQuery.runData?.output.caveat ?? null}
            renderContent={() => (
              <>
                <p className="text-subhead text-text-primary">
                  Fulfilled Orders:{' '}
                  <span className="text-title-3">
                    {fulfilledRows.reduce((total, row) => total + row.fulfilledOrderCount, 0)}
                  </span>
                </p>
                {renderTinyBars(fulfilledRows.slice(-10).map((row) => row.fulfilledOrderCount), 'bg-violet-300/60')}
              </>
            )}
          />

          <SnapshotCard
            title="Top Reversed Products"
            subtitle="Products with the highest reversal volume."
            reportDefinition={reversalsQuery.reportDefinition}
            isLoading={reversalsQuery.runQuery.isLoading}
            isError={reversalsQuery.runQuery.isError}
            unsupportedReason={reversalsQuery.runData?.output.supportReason ?? null}
            partialCaveat={reversalsQuery.runData?.output.caveat ?? null}
            renderContent={() => (
              <div className="mt-2 flex flex-col gap-2">
                {reversalsRows.slice(0, 4).map((row) => (
                  <div key={row.productName} className="flex items-center justify-between rounded-[10px] border border-white/10 bg-black/10 px-3 py-2">
                    <span className="text-footnote text-text-primary">{row.productName}</span>
                    <span className="text-subhead text-rose-200">{row.reversalCount}</span>
                  </div>
                ))}
                {reversalsRows.length === 0 ? (
                  <p className="text-footnote text-text-secondary">No reversal activity for this range.</p>
                ) : null}
              </div>
            )}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5 min-h-40">
          <h2 className="text-title-3 text-text-primary mb-2">Trends</h2>
          <p className="text-body text-text-secondary">Trends visualizations coming soon.</p>
        </div>
        <div className="glass-panel p-5 min-h-40">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-title-3 text-text-primary">Alerts</h2>
            <Link
              href="/dashboard/alerts"
              className="text-subhead text-text-secondary transition-colors hover:text-text-primary"
            >
              View all
            </Link>
          </div>

          {alertsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`dashboard-alert-summary-skeleton-${index}`} className="skeleton h-14" />
              ))}
            </div>
          ) : prioritizedAlerts.length === 0 ? (
            <p className="text-body text-text-secondary">No active alerts.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {prioritizedAlerts.map((alert) => {
                const typeLabel = getTypeLabel(alert.type)

                return (
                  <div
                    key={`${alert.type}-${alert.level}-${alert.title}`}
                    className="rounded-[12px] border border-white/10 bg-black/10 p-3"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-subhead text-text-primary leading-snug">{alert.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-footnote uppercase tracking-wide ${getAlertLevelClasses(alert.level)}`}>
                        {alert.level}
                      </span>
                    </div>
                    <p className="text-footnote text-text-secondary">{alert.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {typeLabel ? (
                        <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-footnote text-amber-200">
                          {typeLabel}
                        </span>
                      ) : null}
                      {alert.count !== undefined ? (
                        <span className="text-footnote text-text-secondary">Count: {alert.count}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
