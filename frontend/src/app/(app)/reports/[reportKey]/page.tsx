import Link from 'next/link'
import { notFound } from 'next/navigation'
import { reportCatalogByKey, type ReportKey } from '@/lib/reports/report-catalog'

type ReportDetailPageProps = {
  params: Promise<{ reportKey: string }>
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { reportKey } = await params
  const report = reportCatalogByKey[reportKey as ReportKey]

  if (!report) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary">{report.label}</h1>
          <p className="mt-1 text-body text-text-secondary">{report.description}</p>
        </div>
        <Link
          href="/reports"
          className="rounded-[8px] bg-black/5 px-4 py-2 text-callout text-text-secondary transition-colors hover:bg-black/10"
        >
          Back to Reports
        </Link>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-headline text-text-primary">Execution Settings</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-caption-1 text-text-tertiary">Default Date Range</p>
            <p className="text-body text-text-primary">{report.defaultFilters.dateRange.replaceAll('_', ' ')}</p>
          </div>
          <div>
            <p className="text-caption-1 text-text-tertiary">Default Region</p>
            <p className="text-body text-text-primary">{report.defaultFilters.region}</p>
          </div>
          <div>
            <p className="text-caption-1 text-text-tertiary">Default Status</p>
            <p className="text-body text-text-primary">{report.defaultFilters.status}</p>
          </div>
          <div>
            <p className="text-caption-1 text-text-tertiary">Export Capability</p>
            <p className="text-body text-text-primary">{report.supportsExport ? 'CSV/Excel ready' : 'No export support'}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-headline text-text-primary">Run Output</h2>
        <p className="mt-2 text-body text-text-secondary">
          Report execution and output rendering will appear here after a run is requested.
        </p>
      </div>
    </div>
  )
}
