'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { useOnboardingStore } from '@/lib/store/onboardingStore'
import { settingsApi } from '@/lib/api/endpoints/settings'

const MAX_EMAIL_ROWS = 5
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export default function InviteOnboardingPage() {
  const router = useRouter()
  const jwt = useAuthStore((s) => s.jwt)
  const workspace = useWorkspaceStore((s) => s.workspace)
  const markInviteStepCompleted = useOnboardingStore((s) => s.markInviteStepCompleted)
  const isInviteStepCompleted = useOnboardingStore((s) => s.isInviteStepCompleted)

  const [emailRows, setEmailRows] = useState<string[]>([''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jwt) {
      router.replace('/login')
      return
    }

    if (!workspace) {
      router.replace('/workspaces')
      return
    }

    if (isInviteStepCompleted(workspace.id)) {
      router.replace('/dashboard')
    }
  }, [isInviteStepCompleted, jwt, router, workspace])

  if (!jwt || !workspace || isInviteStepCompleted(workspace.id)) return null

  const workspaceId = workspace.id

  const rowValidationMessages = useMemo(() => {
    const normalizedWithIndexes = emailRows
      .map((rawEmail, index) => ({
        index,
        normalizedEmail: normalizeEmail(rawEmail),
      }))
      .filter((item) => item.normalizedEmail.length > 0)

    const duplicateIndexSet = new Set<number>()
    const duplicateEmailCount = new Map<string, number>()

    normalizedWithIndexes.forEach((item) => {
      duplicateEmailCount.set(item.normalizedEmail, (duplicateEmailCount.get(item.normalizedEmail) ?? 0) + 1)
    })

    normalizedWithIndexes.forEach((item) => {
      if ((duplicateEmailCount.get(item.normalizedEmail) ?? 0) > 1) {
        duplicateIndexSet.add(item.index)
      }
    })

    return emailRows.map((rawEmail, index) => {
      const normalizedEmail = normalizeEmail(rawEmail)
      if (!normalizedEmail) return ''
      if (!EMAIL_REGEX.test(normalizedEmail)) return 'Enter a valid email format.'
      if (duplicateIndexSet.has(index)) return 'Duplicate email in list.'
      return ''
    })
  }, [emailRows])

  function updateRow(index: number, value: string) {
    setEmailRows((currentRows) => currentRows.map((rowValue, rowIndex) => (rowIndex === index ? value : rowValue)))
  }

  function addRow() {
    setEmailRows((currentRows) => {
      if (currentRows.length >= MAX_EMAIL_ROWS) return currentRows
      return [...currentRows, '']
    })
  }

  async function completeAndContinue() {
    markInviteStepCompleted(workspaceId)
    router.push('/dashboard')
  }

  async function handleSkip() {
    setError(null)
    await completeAndContinue()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (rowValidationMessages.some((message) => message.length > 0)) {
      setError('Please fix invalid or duplicate email entries before continuing.')
      return
    }

    const uniqueEmails = Array.from(
      new Set(
        emailRows
          .map((email) => normalizeEmail(email))
          .filter((email) => email.length > 0)
      )
    )

    if (uniqueEmails.length === 0) {
      setError('Add at least one valid email, or choose “Skip for now”.')
      return
    }

    setIsSubmitting(true)

    try {
      for (const email of uniqueEmails) {
        await settingsApi.inviteMember({ email })
      }

      await completeAndContinue()
    } catch (inviteError) {
      if (inviteError instanceof Error) {
        setError(inviteError.message)
      } else {
        setError('Failed to send one or more invites.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl p-8">
        <h1 className="text-title-2 text-text-primary">Invite your team</h1>
        <p className="text-body text-text-secondary mt-1">
          Add up to 5 teammates now. You can also invite more later from Settings.
        </p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          {emailRows.map((emailValue, index) => (
            <div key={`invite-row-${index}`} className="flex flex-col gap-1">
              <label className="text-footnote text-text-secondary" htmlFor={`invite-email-${index}`}>
                Email {index + 1}
              </label>
              <input
                id={`invite-email-${index}`}
                className={cn(
                  'glass-input',
                  rowValidationMessages[index] ? 'border-destructive/60 focus:border-destructive' : ''
                )}
                type="email"
                placeholder="name@company.com"
                value={emailValue}
                onChange={(event) => updateRow(index, event.target.value)}
              />
              {rowValidationMessages[index] && (
                <p className="text-footnote text-destructive">{rowValidationMessages[index]}</p>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={addRow}
              disabled={emailRows.length >= MAX_EMAIL_ROWS || isSubmitting}
              className={cn(
                'px-3 py-2 rounded-[8px] text-subhead transition-colors',
                emailRows.length >= MAX_EMAIL_ROWS || isSubmitting
                  ? 'bg-black/5 text-text-tertiary cursor-not-allowed'
                  : 'bg-black/10 text-text-secondary hover:text-text-primary hover:bg-black/15'
              )}
            >
              Add another email
            </button>
            <p className="text-footnote text-text-tertiary">{emailRows.length}/{MAX_EMAIL_ROWS} rows used</p>
          </div>

          {error && <p className="text-footnote text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'py-2.5 px-4 rounded-[8px] text-callout text-white transition-all duration-200',
                isSubmitting
                  ? 'bg-accent/50 cursor-not-allowed'
                  : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
              )}
            >
              {isSubmitting ? 'Sending invites…' : 'Send invites and continue'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSkip}
              className={cn(
                'py-2.5 px-4 rounded-[8px] text-callout transition-colors',
                isSubmitting
                  ? 'text-text-tertiary bg-black/5 cursor-not-allowed'
                  : 'text-text-secondary bg-black/10 hover:text-text-primary hover:bg-black/15'
              )}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
