import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface CompletedInviteStepsByWorkspace {
  [workspaceId: string]: boolean
}

interface OnboardingState {
  completedInviteStepsByWorkspace: CompletedInviteStepsByWorkspace
  markInviteStepCompleted: (workspaceId: string) => void
  isInviteStepCompleted: (workspaceId: string) => boolean
}

const cookieStorage = {
  getItem: (name: string) => {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : null
  },
  setItem: (name: string, value: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=2592000;SameSite=Lax`
  },
  removeItem: (name: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=;path=/;max-age=0`
  },
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedInviteStepsByWorkspace: {},
      markInviteStepCompleted: (workspaceId: string) => {
        if (!workspaceId) return

        const current = get().completedInviteStepsByWorkspace
        set({
          completedInviteStepsByWorkspace: {
            ...current,
            [workspaceId]: true,
          },
        })
      },
      isInviteStepCompleted: (workspaceId: string) => {
        if (!workspaceId) return false
        return Boolean(get().completedInviteStepsByWorkspace[workspaceId])
      },
    }),
    {
      name: 'fk-onboarding',
      storage: createJSONStorage(() => cookieStorage),
    }
  )
)
