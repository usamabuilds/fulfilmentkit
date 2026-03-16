'use client'

import { useDashboardAlerts } from '@/lib/hooks/useDashboard'
import type { DashboardAlert, DashboardAlertLevel } from '@/lib/api/endpoints/dashboard'

function getLevelClasses(level: DashboardAlertLevel): string {
  if (level === 'critical') {
    return 'bg-red-500/15 text-red-200 border border-red-400/40'
  }

  if (level === 'warning') {
    return 'bg-amber-500/15 text-amber-200 border border-amber-400/40'
  }

  return 'bg-sky-500/15 text-sky-200 border border-sky-400/40'
}

function AlertRow({ alert }: { alert: DashboardAlert }) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title-3 text-text-primary">{alert.title}</h2>
          <p className="text-body text-text-secondary mt-1">{alert.message}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-footnote uppercase tracking-wide ${getLevelClasses(alert.level)}`}>
          {alert.level}
        </span>
      </div>
      {alert.count !== undefined ? (
        <p className="text-subhead text-text-primary">
          Count: <span className="font-semibold">{alert.count}</span>
        </p>
      ) : null}
    </div>
  )
}

export default function DashboardAlertsPage() {
  const { data, isLoading } = useDashboardAlerts()

  const alerts = data?.data?.alerts ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Alerts</h1>
        <p className="text-body text-text-secondary mt-1">Active alerts for your workspace.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`dashboard-alert-skeleton-${index}`} className="skeleton h-28" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No active alerts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert) => (
            <AlertRow key={`${alert.type}-${alert.level}-${alert.title}`} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
