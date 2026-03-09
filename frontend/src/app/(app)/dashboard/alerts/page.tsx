export default function DashboardAlertsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Alerts</h1>
        <p className="text-body text-text-secondary mt-1">Active alerts for your workspace.</p>
      </div>
      <div className="glass-panel p-12 text-center">
        <p className="text-body text-text-secondary">No active alerts.</p>
      </div>
    </div>
  )
}
