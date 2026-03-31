import Link from 'next/link'
import { reportCatalog } from '@/lib/reports/report-catalog'

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

export default function ReportsPage() {
  const reportsByDomain = reportCatalog.reduce<Record<string, typeof reportCatalog>>((acc, report) => {
    if (!acc[report.domain]) {
      acc[report.domain] = []
    }
    acc[report.domain].push(report)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Orders Reports Center</h1>
        <p className="mt-1 text-body text-text-secondary">
          Run operational and performance reports for your orders workflow across the fulfilment workspace.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {Object.entries(reportsByDomain).map(([domain, reports]) => (
          <section key={domain} className="flex flex-col gap-3">
            <h2 className="text-headline text-text-primary">
              {domain
                .split('-')
                .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
                .join(' ')}
            </h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
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
                    <p className="mt-1 text-footnote text-text-tertiary">{report.description}</p>
                    <p className="mt-2 text-caption text-text-secondary">
                      Requires: {report.requiredCapabilities.join(', ')}
                    </p>
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
                    <span>Default: {report.defaultFilters.dateRange.replaceAll('_', ' ')}</span>
                    <span>{report.supportsExport ? 'CSV export' : 'View only'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
