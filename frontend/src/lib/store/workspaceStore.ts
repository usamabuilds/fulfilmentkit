import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface Workspace {
  id: string
  name: string
  role?: string | null
}

interface WorkspaceState {
  workspace: Workspace | null
  setWorkspace: (workspace: Workspace) => void
  clearWorkspace: () => void
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

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspace: null,
      setWorkspace: (workspace) => set({ workspace }),
      clearWorkspace: () => set({ workspace: null }),
    }),
    {
      name: 'fk-workspace',
      storage: createJSONStorage(() => cookieStorage),
    }
  )
)
