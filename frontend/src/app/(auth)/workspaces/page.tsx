'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { useOnboardingStore } from '@/lib/store/onboardingStore'
import { workspacesApi, type Workspace } from '@/lib/api/endpoints/workspaces'
import { cn } from '@/lib/utils/cn'

interface HttpError extends Error {
  statusCode?: number
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  const typedError = error as HttpError

  if (typedError.statusCode === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (typedError.statusCode === 403) {
    return 'You do not have access to this workspace. Contact your administrator.'
  }

  return error.message || fallback
}

export default function WorkspacesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const isInviteStepCompleted = useOnboardingStore((s) => s.isInviteStepCompleted)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [name, setName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  )

  useEffect(() => {
    let active = true

    async function loadWorkspaces() {
      setLoading(true)
      setError(null)

      try {
        const res = await workspacesApi.list()
        if (!active) return

        const items = res.data.items
        setWorkspaces(items)

        if (items.length === 1) {
          setWorkspace({ id: items[0].id, name: items[0].name })
          router.replace(isInviteStepCompleted(items[0].id) ? '/dashboard' : '/onboarding/invite')
          return
        }

        if (items.length > 1) {
          setSelectedWorkspaceId(items[0].id)
          setShowCreateForm(false)
          return
        }

        setShowCreateForm(true)
      } catch (err) {
        if (!active) return
        const typedError = err as HttpError

        if (typedError.statusCode === 401) {
          setError('Your session has expired. Please sign in again.')
          router.replace('/login')
          return
        }

        setError(getErrorMessage(err, 'Failed to load workspaces'))
      } finally {
        if (active) setLoading(false)
      }
    }

    if (!user) {
      router.replace('/login')
      return
    }

    loadWorkspaces()

    return () => {
      active = false
    }
  }, [isInviteStepCompleted, router, setWorkspace, user])

  async function handleContinue() {
    if (!selectedWorkspace) return
    setError(null)
    setSubmitting(true)

    try {
      setWorkspace({ id: selectedWorkspace.id, name: selectedWorkspace.name })
      router.push(isInviteStepCompleted(selectedWorkspace.id) ? '/dashboard' : '/onboarding/invite')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to select workspace'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreate() {
    if (!name.trim()) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await workspacesApi.create({ name: name.trim() })
      setWorkspace({ id: res.data.id, name: res.data.name })
      router.push(isInviteStepCompleted(res.data.id) ? '/dashboard' : '/onboarding/invite')
    } catch (err) {
      const typedError = err as HttpError
      if (typedError.statusCode === 401) {
        setError('Your session has expired. Please sign in again.')
        router.replace('/login')
        return
      }

      setError(getErrorMessage(err, 'Failed to create workspace'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-title-2 text-text-primary">Choose your workspace</h1>
          <p className="text-body text-text-secondary mt-1">
            Workspaces hold your connections, orders, and inventory data.
          </p>
        </div>

        {loading ? (
          <p className="text-body text-text-secondary">Loading workspaces…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {workspaces.length > 1 && !showCreateForm && (
              <>
                <label className="text-footnote text-text-secondary" htmlFor="workspace-select">
                  Select a workspace
                </label>
                <select
                  id="workspace-select"
                  className="glass-input"
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleContinue}
                  disabled={!selectedWorkspace || submitting}
                  className={cn(
                    'w-full py-2.5 px-4 rounded-[8px] text-callout text-white transition-all duration-200',
                    !selectedWorkspace || submitting
                      ? 'bg-accent/50 cursor-not-allowed'
                      : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
                  )}
                >
                  {submitting ? 'Continuing…' : 'Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="text-footnote text-text-secondary hover:text-text-primary transition-colors"
                >
                  Need a new workspace? Create one
                </button>
              </>
            )}

            {(showCreateForm || workspaces.length === 0) && (
              <>
                {workspaces.length === 0 && (
                  <p className="text-body text-text-secondary">
                    You do not belong to any workspace yet. Create one to get started.
                  </p>
                )}

                <input
                  className="glass-input"
                  type="text"
                  placeholder="Workspace name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <button
                  onClick={handleCreate}
                  disabled={submitting || !name.trim()}
                  className={cn(
                    'w-full py-2.5 px-4 rounded-[8px] text-callout text-white transition-all duration-200',
                    submitting || !name.trim()
                      ? 'bg-accent/50 cursor-not-allowed'
                      : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
                  )}
                >
                  {submitting ? 'Creating…' : 'Create workspace'}
                </button>

                {workspaces.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="text-footnote text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Back to workspace selection
                  </button>
                )}
              </>
            )}

            {error && <p className="text-footnote text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
