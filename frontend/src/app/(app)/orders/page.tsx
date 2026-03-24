'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrderStatusBadge } from '@/components/modules/orders/OrderStatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { useOrders } from '@/lib/hooks/useOrders'
import { useMyPreferences } from '@/lib/hooks/useSettings'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

const PAGE_SIZE = 20


function toInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultDateRangeForCadence(cadence: string | null): { from: string; to: string } {
  const toDate = new Date()
  const fromDate = new Date(toDate)

  if (cadence === 'weekly') {
    fromDate.setDate(toDate.getDate() - 7)
  } else if (cadence === 'biweekly') {
    fromDate.setDate(toDate.getDate() - 14)
  } else {
    fromDate.setDate(toDate.getDate() - 30)
  }

  return {
    from: toInputDate(fromDate),
    to: toInputDate(toDate),
  }
}

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export default function OrdersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [channel, setChannel] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const preferencesQuery = useMyPreferences()

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [search])

  useEffect(() => {
    if (fromDate || toDate) {
      return
    }

    const cadence = preferencesQuery.data?.data.preferences?.planningCadence
    if (cadence !== 'weekly' && cadence !== 'biweekly' && cadence !== 'monthly') {
      return
    }

    const defaults = getDefaultDateRangeForCadence(cadence)
    setFromDate(defaults.from)
    setToDate(defaults.to)
  }, [fromDate, preferencesQuery.data, toDate])

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
      channel: channel || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [channel, debouncedSearch, fromDate, page, status, toDate],
  )

  const { data, isLoading, isError, error, isFetching, refetch } = useOrders(queryParams)

  const orders = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const availableStatuses = useMemo(
    () => Array.from(new Set(orders.map((order) => order.status))).sort((a, b) => a.localeCompare(b)),
    [orders],
  )

  const availableChannels = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .map((order) => order.channel)
            .filter((channelValue): channelValue is string => Boolean(channelValue)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [orders],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel p-6">
        <h1 className="text-title-1 text-text-primary">Orders</h1>
        <p className="mt-1 text-body text-text-secondary">Track order status, value, and creation timeline.</p>
      </div>

      <div className="glass-card p-4">
        <div className="grid gap-4 md:grid-cols-5">
          <label className="flex flex-col gap-2">
            <span className="text-subhead text-text-secondary">Search</span>
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setPage(1)
                setSearch(event.target.value)
              }}
              placeholder="Search order number"
              className="glass-input text-text-primary"
            />
          </label>

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
            <span className="text-subhead text-text-secondary">Channel</span>
            <select
              value={channel}
              onChange={(event) => {
                setPage(1)
                setChannel(event.target.value)
              }}
              className="glass-input text-text-primary"
            >
              <option value="">All channels</option>
              {availableChannels.map((channelValue) => (
                <option key={channelValue} value={channelValue}>
                  {channelValue}
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
      ) : isError ? (
        <EmptyState
          title="Could not load orders"
          subtitle={
            error instanceof Error
              ? `${error.message} Try again or adjust your filters, then retry.`
              : 'Try again or adjust your filters, then retry.'
          }
          action={
            <button
              type="button"
              onClick={() => {
                void refetch()
              }}
              className="rounded-[10px] bg-black/10 px-4 py-2 text-subhead text-text-primary transition-all hover:bg-black/15 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isFetching}
            >
              {isFetching ? 'Retrying...' : 'Retry'}
            </button>
          }
        />
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
