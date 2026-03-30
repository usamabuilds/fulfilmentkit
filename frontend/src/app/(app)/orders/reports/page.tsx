import Link from 'next/link'
import { reportCatalog } from '@/lib/reports/report-catalog'

const reportsBasePath = '/orders/reports'

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Orders Reports Center</h1>
        <p className="mt-1 text-body text-text-secondary">
          Run operational and performance reports for your orders workflow across the fulfilment workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportCatalog.map((report) => (
          <Link
            key={report.key}
            href={`${reportsBasePath}/${report.key}`}
            className="glass-card flex h-full flex-col gap-3 p-5 transition-colors hover:bg-white/10"
          >
            <div>
              <p className="text-headline text-text-primary">{report.label}</p>
              <p className="mt-1 text-footnote text-text-tertiary">{report.description}</p>
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
    </div>
  )
}
