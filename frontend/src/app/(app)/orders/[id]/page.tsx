'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { OrderStatusBadge } from '@/components/modules/orders/OrderStatusBadge'
import { useOrder } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDateTime } from '@/lib/utils/formatDate'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useOrder(id)
  const order = data?.data

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-48" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-body text-text-secondary">Order not found.</p>
        <Link href="/orders" className="text-callout text-accent mt-2 block hover:underline">
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="text-subhead text-text-secondary hover:text-text-primary transition-colors">
          Orders
        </Link>
        <span className="text-text-tertiary">/</span>
        <span className="text-subhead text-text-primary font-mono">{order.externalId}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary font-mono">{order.externalId}</h1>
          <p className="text-body text-text-secondary mt-1">{formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="glass-panel p-6">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-subhead text-text-secondary">Order ID</dt>
            <dd className="text-body text-text-primary mt-0.5 font-mono">{order.id}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">External ID</dt>
            <dd className="text-body text-text-primary mt-0.5 font-mono">{order.externalId}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Total Amount</dt>
            <dd className="text-title-3 text-text-primary mt-0.5">{formatCurrency(order.totalAmount, order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Currency</dt>
            <dd className="text-body text-text-primary mt-0.5">{order.currency}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Status</dt>
            <dd className="mt-0.5">
              <OrderStatusBadge status={order.status} />
            </dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Created</dt>
            <dd className="text-body text-text-primary mt-0.5">{formatDateTime(order.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
