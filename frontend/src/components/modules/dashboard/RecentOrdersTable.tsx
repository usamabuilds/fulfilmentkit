import type { Order } from '@/lib/api/endpoints/orders'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'

interface RecentOrdersTableProps {
  orders: Order[]
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-body text-text-secondary">No orders yet.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left text-subhead text-text-secondary px-5 py-3">Order ID</th>
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
              <td className="px-5 py-3 text-body text-text-primary font-mono text-sm">{order.externalId}</td>
              <td className="px-5 py-3">
                <span className="text-caption-2 px-2 py-0.5 rounded-full bg-black/5 text-text-secondary">
                  {order.status}
                </span>
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
  )
}
