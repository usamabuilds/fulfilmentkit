'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { apiPost } from '@/lib/api/client'
import { settingsApi } from '@/lib/api/endpoints/settings'
import { useWorkspaceRoles } from '@/lib/hooks/useSettings'
import { useAuthStore } from '@/lib/store/authStore'
import { useOnboardingStore } from '@/lib/store/onboardingStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { cn } from '@/lib/utils/cn'

const MAX_EMAIL_ROWS = 5
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface InviteRow {
  id: string
  value: string
  roleDefinitionId: string
}

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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function getRowValidation(rows: InviteRow[]) {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    const normalized = normalizeEmail(row.value)
    if (!normalized) return
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  })

  return rows.map((row) => {
    const normalized = normalizeEmail(row.value)
    const isEmpty = normalized.length === 0
    const isFormatValid = isEmpty || emailPattern.test(normalized)
    const isDuplicate = !isEmpty && (counts.get(normalized) ?? 0) > 1

    return {
      rowId: row.id,
      normalized,
      isEmpty,
      isFormatValid,
      isDuplicate,
    }
  })
}

export default function OnboardingInvitePage() {
  const router = useRouter()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const user = useAuthStore((state) => state.user)
  const jwt = useAuthStore((state) => state.jwt)
  const setAuth = useAuthStore((state) => state.setAuth)
  const markInviteStepCompleted = useOnboardingStore((state) => state.markInviteStepCompleted)

  const [rows, setRows] = useState<InviteRow[]>([{ id: crypto.randomUUID(), value: '', roleDefinitionId: '' }])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [roleDefinitionId, setRoleDefinitionId] = useState<string>('')

  const { data: rolesData } = useWorkspaceRoles()
  const roles = rolesData?.data?.items ?? []

  const fallbackRoleDefinitionId = roleDefinitionId || roles.find((role) => role.legacyRole === 'VIEWER')?.id || ''

  const rowValidation = useMemo(() => getRowValidation(rows), [rows])
  const filledInviteRows = rows
    .map((row) => ({
      normalized: normalizeEmail(row.value),
      roleDefinitionId: row.roleDefinitionId || fallbackRoleDefinitionId,
    }))
    .filter((row) => row.normalized.length > 0)

  const filledRows = rowValidation.filter((row) => !row.isEmpty)
  const hasDuplicateEmails = filledRows.some((row) => row.isDuplicate)
  const hasInvalidFormat = filledRows.some((row) => !row.isFormatValid)
  const hasSubmittableEmails = filledRows.length > 0

  function updateRow(rowId: string, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row
        return {
          ...row,
          value,
          roleDefinitionId: row.roleDefinitionId || fallbackRoleDefinitionId,
        }
      })
    )
  }

  function addRow() {
    setRows((currentRows) => {
      if (currentRows.length >= MAX_EMAIL_ROWS) return currentRows
      return [...currentRows, { id: crypto.randomUUID(), value: '', roleDefinitionId: fallbackRoleDefinitionId }]
    })
  }

  function removeRow(rowId: string) {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [{ ...currentRows[0], value: '' }]
      }
      return currentRows.filter((row) => row.id !== rowId)
    })
  }

  async function completeStepAndContinue() {
    if (!workspace?.id) {
      router.replace('/workspaces')
      return
    }

    markInviteStepCompleted(workspace.id)

    try {
      const completion = await apiPost<CompleteOnboardingResponse>('/onboarding/complete', {})

      if (completion.data.user && jwt) {
        setAuth(
          {
            id: completion.data.user.id,
            email: completion.data.user.email ?? user?.email ?? '',
            emailVerified: completion.data.user.emailVerified,
            onboardingCompleted: completion.data.user.onboardingCompleted,
            nextOnboardingStep: completion.data.user.nextOnboardingStep,
          },
          jwt
        )
      }

      router.push('/dashboard')
    } catch (completionError) {
      if (completionError instanceof Error && completionError.message) {
        throw new Error(`Failed to complete onboarding: ${completionError.message}`)
      }
      throw new Error('Failed to complete onboarding. Please try again.')
    }
  }

  async function handleSkip() {
    setError(null)
    setSubmitting(true)

    try {
      await completeStepAndContinue()
    } catch (skipError) {
      if (skipError instanceof Error) {
        setError(skipError.message)
      } else {
        setError('Failed to complete onboarding. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit() {
    setError(null)

    if (!workspace?.id) {
      router.replace('/workspaces')
      return
    }

    if (!hasSubmittableEmails) {
      setError('Enter at least one email address or choose Skip for now.')
      return
    }

    if (hasInvalidFormat || hasDuplicateEmails) {
      setError('Fix invalid or duplicate email addresses before continuing.')
      return
    }

    setSubmitting(true)

    try {
      for (const row of filledInviteRows) {
        await settingsApi.inviteMember({ email: row.normalized, roleDefinitionId: row.roleDefinitionId || undefined })
      }

      await completeStepAndContinue()
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message)
      } else {
        setError('Failed to send invites. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-caption-2 text-text-tertiary">Step 2</p>
        <h1 className="text-title-2 text-text-primary">Invite your team</h1>
        <p className="text-body text-text-secondary">
          Invite up to five teammates now, or skip and do it later in workspace settings.
        </p>
      </header>

      <div className="glass-card p-4 space-y-3">
        <div className="space-y-3">
          {rows.map((row) => {
            const validation = rowValidation.find((item) => item.rowId === row.id)
            const showInvalidFormat = validation ? !validation.isEmpty && !validation.isFormatValid : false
            const showDuplicate = validation ? validation.isDuplicate : false

            return (
              <div key={row.id} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="email"
                    className={cn(
                      'glass-input flex-1',
                      (showInvalidFormat || showDuplicate) && 'border-destructive/70 focus:border-destructive'
                    )}
                    placeholder="teammate@company.com"
                    value={row.value}
                    onChange={(event) => updateRow(row.id, event.target.value)}
                    disabled={submitting}
                    aria-invalid={showInvalidFormat || showDuplicate}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={submitting}
                    className="px-3 py-2 rounded-[8px] border border-border-default text-footnote text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
                <select
                  value={row.roleDefinitionId || fallbackRoleDefinitionId}
                  onChange={(event) => {
                    const nextRoleId = event.target.value
                    setRows((currentRows) =>
                      currentRows.map((currentRow) =>
                        currentRow.id === row.id ? { ...currentRow, roleDefinitionId: nextRoleId } : currentRow
                      )
                    )
                    setRoleDefinitionId(nextRoleId)
                  }}
                  className="glass-input"
                  disabled={submitting}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {showInvalidFormat && <p className="text-caption text-destructive">Enter a valid email address.</p>}
                {!showInvalidFormat && showDuplicate && (
                  <p className="text-caption text-destructive">Duplicate email address.</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-footnote text-text-secondary">
            {rows.length}/{MAX_EMAIL_ROWS} invite rows
          </p>
          <button
            type="button"
            onClick={addRow}
            disabled={rows.length >= MAX_EMAIL_ROWS || submitting}
            className="px-3 py-2 rounded-[8px] border border-border-default text-footnote text-text-primary hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            Add email
          </button>
        </div>
      </div>

      {error && <p className="text-footnote text-destructive">{error}</p>}

      <div className="flex flex-wrap justify-between gap-2">
        <Link
          href="/onboarding/workspace"
          className="px-4 py-2 rounded-[8px] text-callout text-text-primary border border-border-default hover:bg-black/5 transition-colors duration-200"
        >
          Back
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="px-4 py-2 rounded-[8px] text-callout text-text-secondary border border-border-default hover:text-text-primary hover:bg-black/5 transition-colors duration-200 disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover transition-colors duration-200 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Send invites'}
          </button>
        </div>
      </div>
    </div>
  )
}
