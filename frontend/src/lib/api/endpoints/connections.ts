import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Connection {
  id: string
  platform: string
  status: string
  lastSyncAt: string | null
  createdAt: string
}

export const connectionsApi = {
  list: (workspaceId: string) => apiGetList<Connection>(`/workspaces/${workspaceId}/connections`),

  getOne: (workspaceId: string, connectionId: string) =>
    apiGet<Connection>(`/workspaces/${workspaceId}/connections/${connectionId}`),

  startSync: (workspaceId: string, connectionId: string) =>
    apiPost<void>(`/workspaces/${workspaceId}/connections/${connectionId}/sync`, {}),
}
