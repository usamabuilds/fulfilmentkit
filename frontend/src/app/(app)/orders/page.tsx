'use client'

import Link from 'next/link'
import { useState } from 'react'
import { OrderStatusBadge } from '@/components/modules/orders/OrderStatusBadge'
import { useOrders } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const { data, isLoading } = useOrders({ page, pageSize })

  const orders = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary">Orders</h1>
          <p className="text-body text-text-secondary mt-1">{total > 0 ? `${total} orders` : 'No orders yet'}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No orders found.</p>
        </div>
      ) : (
        <>
          <div className="glass-panel overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-subhead text-text-secondary px-5 py-3">Order</th>
                  <th className="text-left text-subhead text-text-secondary px-5 py-3">Status</th>
                  <th className="text-left text-subhead text-text-secondary px-5 py-3">Amount</th>
                  <th className="text-left text-subhead text-text-secondary px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-black/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-body text-accent hover:underline font-mono text-sm"
                      >
                        {order.externalId}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-body text-text-primary">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-5 py-3 text-body text-text-secondary">{formatDate(order.createdAt)}</td>
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
                  className="px-3 py-1.5 rounded-[8px] text-subhead text-text-secondary hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-[8px] text-subhead text-text-secondary hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
