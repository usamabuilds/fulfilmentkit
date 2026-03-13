import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type NextOnboardingStep = 'verify-email' | 'complete-onboarding' | null

interface User {
  id: string
  email: string
  emailVerified: boolean
  onboardingCompleted: boolean
  nextOnboardingStep: NextOnboardingStep
}

interface AuthState {
  user: User | null
  jwt: string | null
  setAuth: (user: User, jwt: string) => void
  clearAuth: () => void
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      jwt: null,
      setAuth: (user, jwt) => set({ user, jwt }),
      clearAuth: () => set({ user: null, jwt: null }),
    }),
    {
      name: 'fk-auth',
      storage: createJSONStorage(() => cookieStorage),
    }
  )
)
