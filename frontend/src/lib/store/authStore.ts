import { create } from 'zustand'

interface User {
  id: string
  email: string
}

interface AuthState {
  user: User | null
  jwt: string | null
  setAuth: (user: User, jwt: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  jwt: null,
  setAuth: (user, jwt) => set({ user, jwt }),
  clearAuth: () => set({ user: null, jwt: null }),
}))
