'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMyPreferences, useUpdateWorkspaceOnboardingSettings, type WorkspaceOnboardingSettingsDto } from '@/lib/hooks/useSettings'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
] as const

const LOCALE_OPTIONS = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'fr-FR', label: 'Français (France)' },
] as const

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
] as const

const PLANNING_CADENCE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const

export default function OnboardingWorkspacePage() {
  const router = useRouter()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const updateWorkspaceOnboardingSettings = useUpdateWorkspaceOnboardingSettings()
  const preferencesQuery = useMyPreferences()

  const [formValues, setFormValues] = useState<WorkspaceOnboardingSettingsDto>({
    name: workspace?.name ?? '',
    timezone: TIMEZONE_OPTIONS[0].value,
    locale: LOCALE_OPTIONS[0].value,
    defaultCurrency: CURRENCY_OPTIONS[0].value,
    planningCadence: PLANNING_CADENCE_OPTIONS[0].value,
  })
  const [formError, setFormError] = useState<string | null>(null)

  const trimmedWorkspaceName = useMemo(() => formValues.name.trim(), [formValues.name])

  useEffect(() => {
    const preferences = preferencesQuery.data?.data.preferences
    if (!preferences) {
      return
    }

    setFormValues((current) => ({
      ...current,
      timezone: preferences.timezone ?? current.timezone,
      locale: preferences.locale ?? current.locale,
      defaultCurrency: preferences.defaultCurrency ?? current.defaultCurrency,
      planningCadence:
        preferences.planningCadence === 'weekly' || preferences.planningCadence === 'biweekly' || preferences.planningCadence === 'monthly'
          ? preferences.planningCadence
          : current.planningCadence,
    }))
  }, [preferencesQuery.data])

  function updateField<Key extends keyof WorkspaceOnboardingSettingsDto>(field: Key, value: WorkspaceOnboardingSettingsDto[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!workspace?.id) {
      router.replace('/workspaces')
      return
    }

    if (!trimmedWorkspaceName) {
      setFormError('Workspace name is required.')
      return
    }

    try {
      await updateWorkspaceOnboardingSettings.mutateAsync({ ...formValues, name: trimmedWorkspaceName })
      router.push('/onboarding/invite')
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
      } else {
        setFormError('Unable to save workspace settings. Please try again.')
      }
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <header className="space-y-2">
        <p className="text-caption-2 text-text-tertiary">Step 1</p>
        <h1 className="text-title-2 text-text-primary">Set up your workspace</h1>
        <p className="text-body text-text-secondary">
          Choose a workspace name and configure your preferences to personalize FulfilmentKit.
        </p>
      </header>

      <div className="glass-card p-4 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="workspace-name" className="text-footnote text-text-secondary">
            Workspace name
          </label>
          <input
            id="workspace-name"
            type="text"
            className="glass-input"
            maxLength={120}
            value={formValues.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="Acme Operations"
            disabled={updateWorkspaceOnboardingSettings.isPending}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="workspace-timezone" className="text-footnote text-text-secondary">
              Timezone
            </label>
            <select
              id="workspace-timezone"
              className="glass-input"
              value={formValues.timezone}
              onChange={(event) => updateField('timezone', event.target.value)}
              disabled={updateWorkspaceOnboardingSettings.isPending}
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspace-locale" className="text-footnote text-text-secondary">
              Locale
            </label>
            <select
              id="workspace-locale"
              className="glass-input"
              value={formValues.locale}
              onChange={(event) => updateField('locale', event.target.value)}
              disabled={updateWorkspaceOnboardingSettings.isPending}
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspace-currency" className="text-footnote text-text-secondary">
              Default currency
            </label>
            <select
              id="workspace-currency"
              className="glass-input"
              value={formValues.defaultCurrency}
              onChange={(event) => updateField('defaultCurrency', event.target.value)}
              disabled={updateWorkspaceOnboardingSettings.isPending}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspace-cadence" className="text-footnote text-text-secondary">
              Planning cadence
            </label>
            <select
              id="workspace-cadence"
              className="glass-input"
              value={formValues.planningCadence}
              onChange={(event) => updateField('planningCadence', event.target.value as WorkspaceOnboardingSettingsDto['planningCadence'])}
              disabled={updateWorkspaceOnboardingSettings.isPending}
            >
              {PLANNING_CADENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {formError && <p className="text-footnote text-destructive">{formError}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover transition-colors duration-200 disabled:opacity-50"
          disabled={updateWorkspaceOnboardingSettings.isPending}
        >
          {updateWorkspaceOnboardingSettings.isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </form>
  )
}
