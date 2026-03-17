import { create } from 'zustand'
import type { PlanningCadence, UserPreferences } from '@/lib/api/endpoints/settings'

interface PreferencesState {
  preferences: UserPreferences | null
  setPreferences: (preferences: UserPreferences | null) => void
  clearPreferences: () => void
}

const fallbackPreferences = {
  locale: 'en-US',
  timezone: 'UTC',
  defaultCurrency: 'USD',
  planningCadence: 'weekly' as PlanningCadence,
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: null,
  setPreferences: (preferences) => set({ preferences }),
  clearPreferences: () => set({ preferences: null }),
}))

export function getPreferredLocale(): string {
  return usePreferencesStore.getState().preferences?.locale ?? fallbackPreferences.locale
}

export function getPreferredTimezone(): string {
  return usePreferencesStore.getState().preferences?.timezone ?? fallbackPreferences.timezone
}

export function getPreferredCurrency(): string {
  return usePreferencesStore.getState().preferences?.defaultCurrency ?? fallbackPreferences.defaultCurrency
}

export function getPreferredPlanningCadence(): PlanningCadence {
  const cadence = usePreferencesStore.getState().preferences?.planningCadence
  if (cadence === 'weekly' || cadence === 'biweekly' || cadence === 'monthly') {
    return cadence
  }

  return fallbackPreferences.planningCadence
}

