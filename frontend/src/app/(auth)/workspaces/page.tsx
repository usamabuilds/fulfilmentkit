'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { workspacesApi, type Workspace } from '@/lib/api/endpoints/workspaces'
import { apiPost } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { useOnboardingStore } from '@/lib/store/onboardingStore'

interface HttpError extends Error {
  statusCode?: number
}

const WORKSPACE_BOOTSTRAP_HEADER_MESSAGE = 'X-Workspace-Id header is required'

interface CompleteOnboardingResponse {
  updated: boolean
  user?: {
    id: string
    email: string | null
    emailVerified: boolean
    onboardingCompleted: boolean
    nextOnboardingStep: 'verify-email' | 'complete-onboarding' | null
  }
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

function getPostWorkspaceRoute(workspaceId: string, isInviteComplete: (workspaceId: string) => boolean) {
  return isInviteComplete(workspaceId) ? '/dashboard' : '/onboarding/invite'
}

function isWorkspaceBootstrapHeaderError(error: HttpError): boolean {
  return error.statusCode === 400 && error.message.includes(WORKSPACE_BOOTSTRAP_HEADER_MESSAGE)
}

export default function WorkspacesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const jwt = useAuthStore((s) => s.jwt)
  const setAuth = useAuthStore((s) => s.setAuth)
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

  async function completeOnboardingIfEligible(workspaceId: string) {
    if (!user || !jwt || user.onboardingCompleted) return
    if (!isInviteStepCompleted(workspaceId)) return

    const completion = await apiPost<CompleteOnboardingResponse>('/onboarding/complete', {})

    if (!completion.data.user) return

    setAuth(
      {
        id: completion.data.user.id,
        email: completion.data.user.email ?? user.email,
        emailVerified: completion.data.user.emailVerified,
        onboardingCompleted: completion.data.user.onboardingCompleted,
        nextOnboardingStep: completion.data.user.nextOnboardingStep,
      },
      jwt
    )
  }

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
          const workspace = items[0]
          setWorkspace({ id: workspace.id, name: workspace.name })
          await completeOnboardingIfEligible(workspace.id)
          router.replace(getPostWorkspaceRoute(workspace.id, isInviteStepCompleted))
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

        if (isWorkspaceBootstrapHeaderError(typedError)) {
          setShowCreateForm(true)
          setError('Workspace bootstrap is misconfigured; select/create workspace cannot proceed.')

          if (process.env.NODE_ENV !== 'production') {
            console.error('[workspaces.loadWorkspaces] bootstrap header issue', {
              statusCode: typedError.statusCode,
              message: typedError.message,
              route: pathname,
            })
          }
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
  }, [isInviteStepCompleted, pathname, router, setWorkspace, user])

  async function handleContinue() {
    if (!selectedWorkspace) return
    setError(null)
    setSubmitting(true)

    try {
      setWorkspace({ id: selectedWorkspace.id, name: selectedWorkspace.name })
      await completeOnboardingIfEligible(selectedWorkspace.id)
      router.push(getPostWorkspaceRoute(selectedWorkspace.id, isInviteStepCompleted))
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
      await completeOnboardingIfEligible(res.data.id)
      router.push(getPostWorkspaceRoute(res.data.id, isInviteStepCompleted))
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
