import { apiGet, apiGetList, apiPatch } from '@/lib/api/client'

export interface WorkspaceSettings {
  id: string
  name: string
  createdAt: string
}

export interface WorkspaceMember {
  id: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'VIEWER'
  joinedAt: string
}

export const settingsApi = {
  getWorkspace: () => apiGet<WorkspaceSettings>('/settings'),

  updateWorkspace: (dto: { name: string }) => apiPatch<WorkspaceSettings>('/settings', dto),

  listMembers: () => apiGetList<WorkspaceMember>('/settings/members'),
}
