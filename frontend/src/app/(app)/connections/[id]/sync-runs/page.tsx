'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function SyncRunsPage() {
  useParams<{ id: string }>()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/connections" className="text-subhead text-text-secondary hover:text-text-primary transition-colors">
          Connections
        </Link>
        <span className="text-text-tertiary">/</span>
        <span className="text-subhead text-text-primary">Sync Runs</span>
      </div>

      <div>
        <h1 className="text-title-1 text-text-primary">Sync Runs</h1>
        <p className="text-body text-text-secondary mt-1">History of sync runs for this connection.</p>
      </div>

      <div className="glass-panel p-12 text-center">
        <p className="text-body text-text-secondary">No sync runs yet.</p>
      </div>
    </div>
  )
}
