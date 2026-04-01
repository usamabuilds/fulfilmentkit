'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type ReportDefinitionDto, type ReportKey } from '@/lib/api/endpoints/reports'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

const reportsBasePath = '/orders/reports'
const supportBadgeClassByStatus = {
  supported: 'bg-emerald-500/15 text-emerald-200',
  partial: 'bg-amber-500/15 text-amber-200',
  unsupported: 'bg-rose-500/15 text-rose-200',
} as const

const supportLabelByStatus = {
  supported: 'Supported',
  partial: 'Partial',
  unsupported: 'Unsupported',
} as const

const reportDomainByKey: Record<ReportKey, string> = {
  'sales-summary': 'finance',
  'inventory-aging': 'inventory',
  'order-fulfillment-health': 'fulfillment',
  'orders-reversals-by-product': 'transactional',
  'orders-over-time': 'transactional',
  'shipping-delivery-performance': 'fulfillment',
  'orders-fulfilled-over-time': 'fulfillment',
  'shipping-labels-over-time': 'fulfillment',
  'shipping-labels-by-order': 'fulfillment',
  'items-bought-together': 'feature-specific',
}

function formatDomainLabel(domain: string): string {
  return domain
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function getReportDomain(report: ReportDefinitionDto): string {
  return reportDomainByKey[report.key] ?? 'other'
}

function getDefaultDateRangeLabel(report: ReportDefinitionDto): string {
  const value = report.defaultFilters.dateRange
  if (typeof value === 'string') {
    return value.replaceAll('_', ' ')
  }

  return 'custom'
}

function getRequiredFeaturesLabel(report: ReportDefinitionDto): string {
  if (!report.requiredFeatures || report.requiredFeatures.length === 0) {
    return 'none'
  }
  return report.requiredFeatures.join(', ')
}

export default function ReportsPage() {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)

  const reportsQuery = useQuery({
    queryKey: ['report-definitions', workspaceId],
    queryFn: () => reportsApi.list(),
    enabled: Boolean(workspaceId),
  })

  const reportsByDomain = useMemo(() => {
    const reports = reportsQuery.data?.data.items ?? []
    return reports.reduce<Record<string, ReportDefinitionDto[]>>((acc, report) => {
      const domain = getReportDomain(report)
      if (!acc[domain]) {
        acc[domain] = []
      }
      acc[domain].push(report)
      return acc
    }, {})
  }, [reportsQuery.data])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Orders Reports Center</h1>
        <p className="mt-1 text-body text-text-secondary">
          Run operational and performance reports for your orders workflow across the fulfilment workspace.
        </p>
      </div>

      {reportsQuery.isError ? (
        <div className="glass-card p-5 text-footnote text-rose-200">
          Failed to load reports. Please refresh and try again.
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {Object.entries(reportsByDomain).map(([domain, reports]) => (
          <section key={domain} className="flex flex-col gap-3">
            <h2 className="text-headline text-text-primary">{formatDomainLabel(domain)}</h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
                report.supportStatus === 'unsupported' ? (
                  <div
                    key={report.key}
                    className="glass-card flex h-full flex-col gap-3 p-5 opacity-85"
                    aria-disabled="true"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-headline text-text-primary">{report.label}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-caption-2 font-medium uppercase tracking-wide ${
                            supportBadgeClassByStatus[report.supportStatus]
                          }`}
                        >
                          {supportLabelByStatus[report.supportStatus]}
                        </span>
                      </div>
                      {report.supportReason ? (
                        <p className="mt-1 text-footnote text-text-tertiary">{report.supportReason}</p>
                      ) : null}
                      <p className="mt-2 text-caption text-text-secondary">Requires: {getRequiredFeaturesLabel(report)}</p>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      {report.supportedPlatforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-full bg-black/5 px-2.5 py-1 text-caption-2 uppercase tracking-wide text-text-secondary"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-footnote text-text-secondary">
                      <span>Default: {getDefaultDateRangeLabel(report)}</span>
                      <span>Not runnable</span>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={report.key}
                    href={`${reportsBasePath}/${report.key}`}
                    className="glass-card flex h-full flex-col gap-3 p-5 transition-colors hover:bg-white/10"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-headline text-text-primary">{report.label}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-caption-2 font-medium uppercase tracking-wide ${
                            supportBadgeClassByStatus[report.supportStatus]
                          }`}
                        >
                          {supportLabelByStatus[report.supportStatus]}
                        </span>
                      </div>
                      {report.supportReason ? (
                        <p className="mt-1 text-footnote text-text-tertiary">{report.supportReason}</p>
                      ) : null}
                      <p className="mt-2 text-caption text-text-secondary">Requires: {getRequiredFeaturesLabel(report)}</p>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      {report.supportedPlatforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-full bg-black/5 px-2.5 py-1 text-caption-2 uppercase tracking-wide text-text-secondary"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-footnote text-text-secondary">
                      <span>Default: {getDefaultDateRangeLabel(report)}</span>
                      <span>{report.supportsExport ? 'CSV export' : 'View only'}</span>
                    </div>
                  </Link>
                )
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
