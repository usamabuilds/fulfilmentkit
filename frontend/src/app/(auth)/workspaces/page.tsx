'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { workspacesApi } from '@/lib/api/endpoints/workspaces'
import { cn } from '@/lib/utils/cn'

export default function WorkspacesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await workspacesApi.create({ name: name.trim() })
      setWorkspace({ id: res.data.id, name: res.data.name })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm p-8">
        <div className="mb-8">
          <h1 className="text-title-2 text-text-primary">Create a workspace</h1>
          <p className="text-body text-text-secondary mt-1">
            A workspace holds your connections, orders, and inventory data.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            className="glass-input"
            type="text"
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {error && <p className="text-footnote text-destructive">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className={cn(
              'w-full py-2.5 px-4 rounded-[8px] text-callout text-white transition-all duration-200',
              loading || !name.trim()
                ? 'bg-accent/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            {loading ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}
