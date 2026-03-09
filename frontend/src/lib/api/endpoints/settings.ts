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
  getWorkspace: (workspaceId: string) =>
    apiGet<WorkspaceSettings>(`/workspaces/${workspaceId}`),

  updateWorkspace: (workspaceId: string, dto: { name: string }) =>
    apiPatch<WorkspaceSettings>(`/workspaces/${workspaceId}`, dto),

  listMembers: (workspaceId: string) =>
    apiGetList<WorkspaceMember>(`/workspaces/${workspaceId}/members`),
}
