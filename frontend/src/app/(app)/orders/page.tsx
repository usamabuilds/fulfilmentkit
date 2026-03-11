'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrderStatusBadge } from '@/components/modules/orders/OrderStatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { useOrders } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

const PAGE_SIZE = 20

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export default function OrdersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: status || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [fromDate, page, status, toDate],
  )

  const { data, isLoading } = useOrders(queryParams)

  const orders = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const availableStatuses = useMemo(
    () => Array.from(new Set(orders.map((order) => order.status))).sort((a, b) => a.localeCompare(b)),
    [orders],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel p-6">
        <h1 className="text-title-1 text-text-primary">Orders</h1>
        <p className="mt-1 text-body text-text-secondary">Track order status, value, and creation timeline.</p>
      </div>

      <div className="glass-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-subhead text-text-secondary">Status</span>
            <select
              value={status}
              onChange={(event) => {
                setPage(1)
                setStatus(event.target.value)
              }}
              className="glass-input text-text-primary"
            >
              <option value="">All statuses</option>
              {availableStatuses.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {statusValue}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-subhead text-text-secondary">From date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setPage(1)
                setFromDate(event.target.value)
              }}
              className="glass-input text-text-primary"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-subhead text-text-secondary">To date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setPage(1)
                setToDate(event.target.value)
              }}
              className="glass-input text-text-primary"
            />
          </label>
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton rows={8} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          subtitle="Try adjusting the status or date range filters to find matching orders."
        />
      ) : (
        <>
          <div className="glass-panel overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Order ID</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Channel</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Status</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Total</th>
                  <th className="px-5 py-3 text-left text-subhead text-text-secondary">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        router.push(`/orders/${order.id}`)
                      }
                    }}
                    className="cursor-pointer border-b border-border-subtle transition-colors hover:bg-black/[0.02] last:border-0"
                  >
                    <td className="px-5 py-3 text-body text-text-primary font-mono">
                      {order.orderNumber ?? order.externalRef ?? order.id}
                    </td>
                    <td className="px-5 py-3 text-body text-text-secondary">{order.channel}</td>
                    <td className="px-5 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-body text-text-primary">
                      {formatCurrency(parseAmount(order.total), order.currency)}
                    </td>
                    <td className="px-5 py-3 text-body text-text-secondary">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card flex items-center justify-between p-4">
            <p className="text-footnote text-text-secondary">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page === 1}
                className="rounded-[8px] px-3 py-1.5 text-subhead text-text-primary transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                disabled={page === totalPages}
                className="rounded-[8px] px-3 py-1.5 text-subhead text-text-primary transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
