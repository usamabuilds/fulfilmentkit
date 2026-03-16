'use client'

import { RecentOrdersTable } from '@/components/modules/dashboard/RecentOrdersTable'
import { StatCard } from '@/components/modules/dashboard/StatCard'
import { useDashboardStats } from '@/lib/hooks/useDashboard'
import { useOrders } from '@/lib/hooks/useOrders'
import { formatCurrency } from '@/lib/utils/formatCurrency'

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useDashboardStats()
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ pageSize: 5 })

  const stats = statsData?.data
  const orders = ordersData?.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Dashboard</h1>
        <p className="text-body text-text-secondary mt-1">Your fulfilment overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </>
        ) : (
          <>
            <StatCard label="Orders" value={stats?.orders ?? 0} />
            <StatCard
              label="Revenue"
              value={formatCurrency(Number(stats?.revenue ?? '0'))}
              accent="success"
            />
            <StatCard label="Units" value={stats?.units ?? 0} accent="warning" />
            <StatCard
              label="Low Stock Items"
              value={stats?.lowStockCount ?? 0}
              accent={stats?.lowStockCount ? 'destructive' : 'default'}
            />
          </>
        )}
      </div>

      <div>
        <h2 className="text-title-3 text-text-primary mb-3">Recent Orders</h2>
        {ordersLoading ? <div className="skeleton h-48" /> : <RecentOrdersTable orders={orders} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5 min-h-40">
          <h2 className="text-title-3 text-text-primary mb-2">Trends</h2>
          <p className="text-body text-text-secondary">Trends visualizations coming soon.</p>
        </div>
        <div className="glass-panel p-5 min-h-40">
          <h2 className="text-title-3 text-text-primary mb-2">Alerts</h2>
          <p className="text-body text-text-secondary">Operational alerts will appear here.</p>
        </div>
      </div>
    </div>
  )
}
