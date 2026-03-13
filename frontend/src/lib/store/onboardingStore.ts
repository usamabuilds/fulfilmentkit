import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface OnboardingState {
  completedInviteByWorkspaceId: Record<string, true>
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
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=604800;SameSite=Lax`
  },
  removeItem: (name: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=;path=/;max-age=0`
  },
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedInviteByWorkspaceId: {},
      markInviteStepCompleted: (workspaceId) =>
        set((state) => ({
          completedInviteByWorkspaceId: {
            ...state.completedInviteByWorkspaceId,
            [workspaceId]: true,
          },
        })),
      isInviteStepCompleted: (workspaceId) => Boolean(get().completedInviteByWorkspaceId[workspaceId]),
    }),
    {
      name: 'fk-onboarding',
      storage: createJSONStorage(() => cookieStorage),
    }
  )
)
