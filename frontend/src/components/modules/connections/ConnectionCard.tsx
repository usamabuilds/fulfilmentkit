import type { Connection } from '@/lib/api/endpoints/connections'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'

interface ConnectionCardProps {
  connection: Connection
  onSync: () => void
  syncing: boolean
}

const statusStyles: Record<Connection['status'], string> = {
  active: 'bg-success/10 text-success',
  disconnected: 'bg-black/5 text-text-secondary',
  error: 'bg-destructive/10 text-destructive',
}

export function ConnectionCard({ connection, onSync, syncing }: ConnectionCardProps) {
  const style = statusStyles[connection.status]

  return (
    <div className="glass-panel flex items-center justify-between gap-4 p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-headline capitalize text-text-primary">{connection.platform}</span>
          <span className={cn('rounded-full px-2.5 py-1 text-caption-2', style)}>{connection.status}</span>
        </div>
        <p className="text-footnote text-text-tertiary">
          {connection.lastSyncAt
            ? `Last synced ${formatDateTime(connection.lastSyncAt)}`
            : 'Never synced'}
        </p>
      </div>

      <button
        onClick={onSync}
        disabled={syncing}
        className={cn(
          'rounded-[8px] px-4 py-2 text-subhead transition-all duration-200',
          syncing
            ? 'cursor-not-allowed bg-accent/40 text-white'
            : 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]'
        )}
      >
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  )
}
