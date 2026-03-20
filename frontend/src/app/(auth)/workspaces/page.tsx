'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { workspacesApi, type Workspace } from '@/lib/api/endpoints/workspaces'
import { apiGet } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'

interface HttpError extends Error {
  statusCode?: number
}

const WORKSPACE_BOOTSTRAP_HEADER_MESSAGE = 'X-Workspace-Id header is required'

type NextOnboardingStep = 'verify-email' | 'complete-onboarding' | 'workspace' | 'invite' | null
type AuthStoreNextOnboardingStep = 'verify-email' | 'complete-onboarding' | null

interface MeResponse {
  user?: {
    id: string
    email: string | null
    emailVerified: boolean
    onboardingCompleted: boolean
    nextOnboardingStep: NextOnboardingStep
  }
  workspaceId: string | null
  // Optional metadata from /me for selected-workspace UX; do not require for routing/auth gate.
  workspaceRole?: string | null
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

function getPostWorkspaceRoute(params: {
  user: MeResponse['user']
  localSelectedWorkspaceId: string | null
}): string {
  const { user, localSelectedWorkspaceId } = params
  if (!user) return '/login'
  if (user.onboardingCompleted) {
    return localSelectedWorkspaceId ? '/dashboard' : '/onboarding/workspace'
  }

  if (user.nextOnboardingStep === 'verify-email') {
    return '/verify-email'
  }

  if (user.nextOnboardingStep === 'workspace') {
    return '/onboarding/workspace'
  }

  if (user.nextOnboardingStep === 'invite') {
    return localSelectedWorkspaceId ? '/onboarding/invite' : '/onboarding/workspace'
  }

  if (user.nextOnboardingStep === 'complete-onboarding') {
    return localSelectedWorkspaceId ? '/onboarding/invite' : '/onboarding/workspace'
  }

  return localSelectedWorkspaceId ? '/onboarding/invite' : '/onboarding/workspace'
}

function toAuthStoreStep(step: NextOnboardingStep): AuthStoreNextOnboardingStep {
  if (step === 'verify-email' || step === 'complete-onboarding') {
    return step
  }

  return null
}

function isWorkspaceBootstrapHeaderError(error: HttpError): boolean {
  return error.statusCode === 400 && error.message.includes(WORKSPACE_BOOTSTRAP_HEADER_MESSAGE)
}

function devLog(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return
  console.info(`[workspaces.route] ${event}`, details)
}

export default function WorkspacesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const jwt = useAuthStore((s) => s.jwt)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)

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

  async function resolvePostWorkspaceRoute(localSelectedWorkspaceId: string | null) {
    const meResponse = await apiGet<MeResponse>('/me')
    const postWorkspaceRoute = getPostWorkspaceRoute({
      user: meResponse.data.user,
      localSelectedWorkspaceId,
    })

    devLog('route decision from backend state', {
      target: postWorkspaceRoute,
      localSelectedWorkspaceId,
      backendWorkspaceId: meResponse.data.workspaceId,
      hasUser: Boolean(meResponse.data.user),
      nextOnboardingStep: meResponse.data.user?.nextOnboardingStep ?? null,
      onboardingCompleted: meResponse.data.user?.onboardingCompleted ?? null,
    })

    if (meResponse.data.user && jwt) {
      setAuth(
        {
          id: meResponse.data.user.id,
          email: meResponse.data.user.email ?? user?.email ?? '',
          emailVerified: meResponse.data.user.emailVerified,
          onboardingCompleted: meResponse.data.user.onboardingCompleted,
          nextOnboardingStep: toAuthStoreStep(meResponse.data.user.nextOnboardingStep),
        },
        jwt
      )
    }

    return postWorkspaceRoute
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
          devLog('local store auto-selected workspace', {
            workspaceId: workspace.id,
            reason: 'single-workspace',
          })
          const postWorkspaceRoute = await resolvePostWorkspaceRoute(workspace.id)
          router.replace(postWorkspaceRoute)
          return
        }

        if (items.length > 1) {
          setSelectedWorkspaceId(items[0].id)
          devLog('local store route deferred', {
            selectedWorkspaceId: items[0].id,
            reason: 'multiple-workspaces-awaiting-user-selection',
          })
          setShowCreateForm(false)
          return
        }

        devLog('local store route deferred', {
          reason: 'no-workspaces-show-create-form',
        })
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
      devLog('route decision from local store', {
        target: '/login',
        reason: 'missing-auth-user',
      })
      router.replace('/login')
      return
    }

    void loadWorkspaces()

    return () => {
      active = false
    }
  }, [jwt, pathname, router, setAuth, setWorkspace, user])

  async function handleContinue() {
    if (!selectedWorkspace) return
    setError(null)
    setSubmitting(true)

    try {
      setWorkspace({ id: selectedWorkspace.id, name: selectedWorkspace.name })
      const postWorkspaceRoute = await resolvePostWorkspaceRoute(selectedWorkspace.id)
      router.push(postWorkspaceRoute)
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
      const postWorkspaceRoute = await resolvePostWorkspaceRoute(res.data.id)
      router.push(postWorkspaceRoute)
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
