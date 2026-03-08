'use client'

import { ConnectionCard } from '@/components/modules/connections/ConnectionCard'
import type { Connection } from '@/lib/api/endpoints/connections'
import { useConnections, useStartSync } from '@/lib/hooks/useConnections'

function ConnectionItem({ connection }: { connection: Connection }) {
  const { mutate, isPending } = useStartSync(connection.id)

  return <ConnectionCard connection={connection} onSync={() => mutate()} syncing={isPending} />
}

export default function ConnectionsPage() {
  const { data, isLoading } = useConnections()
  const connections = data?.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Connections</h1>
        <p className="mt-1 text-body text-text-secondary">Manage your platform integrations.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-20" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No connections yet.</p>
          <p className="mt-1 text-footnote text-text-tertiary">
            Connect a platform to start syncing data.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {connections.map((connection) => (
            <ConnectionItem key={connection.id} connection={connection} />
          ))}
        </div>
      )}
    </div>
  )
}
