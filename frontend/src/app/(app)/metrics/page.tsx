'use client'

import { useState } from 'react'
import { useMetrics } from '@/lib/hooks/useMetrics'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

export default function MetricsPage() {
  const [page, setPage] = useState(1)
  const pageSize = 30
  const { data, isLoading } = useMetrics({ page, pageSize })

  const metrics = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Metrics</h1>
        <p className="mt-1 text-body text-text-secondary">Daily performance metrics.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No metrics yet.</p>
          <p className="mt-1 text-footnote text-text-tertiary">Run a compute job to generate metrics.</p>
        </div>
      ) : (
        <>
          <div className="glass-panel overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Date</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Revenue</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Orders</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Units Sold</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr
                    key={metric.id}
                    className="border-b border-border-subtle transition-colors last:border-0 hover:bg-black/[0.02]"
                  >
                    <td className="px-5 py-3 text-body text-text-primary">{formatDate(metric.date)}</td>
                    <td className="px-5 py-3 text-body text-text-primary">
                      {formatCurrency(metric.revenue, metric.currency)}
                    </td>
                    <td className="px-5 py-3 text-body text-text-primary">{metric.orders}</td>
                    <td className="px-5 py-3 text-body text-text-primary">{metric.unitsSold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-footnote text-text-secondary">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-[8px] px-3 py-1.5 text-subhead text-text-secondary transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-[8px] px-3 py-1.5 text-subhead text-text-secondary transition-all hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
