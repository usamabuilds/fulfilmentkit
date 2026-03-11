'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { OrderStatusBadge } from '@/components/modules/orders/OrderStatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { useOrder } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDateTime } from '@/lib/utils/formatDate'

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useOrder(id)
  const order = data?.data

  if (isLoading) {
    return <PageSkeleton rows={6} />
  }

  if (isError || !order) {
    return (
      <EmptyState
        title="Order not found"
        subtitle="The requested order could not be loaded."
        action={
          <Link href="/orders" className="text-subhead text-text-primary">
            Back to orders
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-4">
        <Link href="/orders" className="text-subhead text-text-secondary transition-colors hover:text-text-primary">
          ← Back to orders
        </Link>
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-title-1 font-mono text-text-primary">{order.orderNumber ?? order.externalRef ?? order.id}</h1>
            <p className="mt-1 text-body text-text-secondary">Channel: {order.channel}</p>
            <p className="text-body text-text-secondary">Created: {formatDateTime(order.createdAt)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-headline text-text-primary">Order details</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-subhead text-text-secondary">ID</dt>
            <dd className="mt-1 font-mono text-body text-text-primary">{order.id}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">External reference</dt>
            <dd className="mt-1 font-mono text-body text-text-primary">{order.externalRef ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Order number</dt>
            <dd className="mt-1 font-mono text-body text-text-primary">{order.orderNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Ordered at</dt>
            <dd className="mt-1 text-body text-text-primary">{formatDateTime(order.orderedAt)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Currency</dt>
            <dd className="mt-1 text-body text-text-primary">{order.currency}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Subtotal</dt>
            <dd className="mt-1 text-body text-text-primary">{formatCurrency(parseAmount(order.subtotal), order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Tax</dt>
            <dd className="mt-1 text-body text-text-primary">{formatCurrency(parseAmount(order.tax), order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Shipping</dt>
            <dd className="mt-1 text-body text-text-primary">{formatCurrency(parseAmount(order.shipping), order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Total</dt>
            <dd className="mt-1 text-body text-text-primary">{formatCurrency(parseAmount(order.total), order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Fees total</dt>
            <dd className="mt-1 text-body text-text-primary">{formatCurrency(parseAmount(order.feesTotal), order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Refunds total</dt>
            <dd className="mt-1 text-body text-text-primary">{formatCurrency(parseAmount(order.refundsTotal), order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">COGS total</dt>
            <dd className="mt-1 text-body text-text-primary">{formatCurrency(parseAmount(order.cogsTotal), order.currency)}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Updated at</dt>
            <dd className="mt-1 text-body text-text-primary">{formatDateTime(order.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      {order.items.length > 0 && (
        <div className="glass-panel overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-headline text-text-primary">Line items</h2>
          </div>
          <table className="mt-4 w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-subhead text-text-secondary">Line</th>
                <th className="px-5 py-3 text-left text-subhead text-text-secondary">Product</th>
                <th className="px-5 py-3 text-left text-subhead text-text-secondary">Quantity</th>
                <th className="px-5 py-3 text-left text-subhead text-text-secondary">Unit price</th>
                <th className="px-5 py-3 text-left text-subhead text-text-secondary">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-3 font-mono text-body text-text-primary">{item.lineKey}</td>
                  <td className="px-5 py-3 text-body text-text-secondary">{item.name ?? item.sku ?? item.productId ?? '—'}</td>
                  <td className="px-5 py-3 text-body text-text-primary">{item.quantity}</td>
                  <td className="px-5 py-3 text-body text-text-primary">
                    {formatCurrency(parseAmount(item.unitPrice), order.currency)}
                  </td>
                  <td className="px-5 py-3 text-body text-text-primary">{formatCurrency(parseAmount(item.total), order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
