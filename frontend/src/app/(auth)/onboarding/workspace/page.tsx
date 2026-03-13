'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { workspacesApi } from '@/lib/api/endpoints/workspaces'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { cn } from '@/lib/utils/cn'
import { POST_AUTH_ROUTES } from '@/lib/utils/postAuthRoute'

interface HttpError extends Error {
  statusCode?: number
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  return error.message || fallback
}

export default function OnboardingWorkspacePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadWorkspaces() {
      setLoading(true)
      setError(null)

      try {
        const res = await workspacesApi.list()
        if (!active) return

        const existingWorkspace = res.data.items[0] ?? null
        if (!existingWorkspace) return

        setWorkspace({ id: existingWorkspace.id, name: existingWorkspace.name })
        router.replace(POST_AUTH_ROUTES.dashboard)
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

    void loadWorkspaces()

    return () => {
      active = false
    }
  }, [router, setWorkspace, user])

  async function handleCreateWorkspace() {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await workspacesApi.create({ name: name.trim() })
      setWorkspace({ id: res.data.id, name: res.data.name })
      router.push(POST_AUTH_ROUTES.onboardingInvite)
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
          <h1 className="text-title-2 text-text-primary">Create your workspace</h1>
          <p className="text-body text-text-secondary mt-1">
            Step 1 of onboarding: start by creating your workspace.
          </p>
        </div>

        {loading ? (
          <p className="text-body text-text-secondary">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              className="glass-input"
              type="text"
              placeholder="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button
              onClick={handleCreateWorkspace}
              disabled={submitting || !name.trim()}
              className={cn(
                'w-full py-2.5 px-4 rounded-[8px] text-callout text-white transition-all duration-200',
                submitting || !name.trim()
                  ? 'bg-accent/50 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
              )}
            >
              {submitting ? 'Creating…' : 'Continue'}
            </button>

            {error && <p className="text-footnote text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
