import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Connection {
  id: string
  platform: string
  status: string
  lastSyncAt: string | null
  createdAt: string
}

export const connectionsApi = {
  list: () => apiGetList<Connection>('/connections'),

  getOne: (connectionId: string) => apiGet<Connection>(`/connections/${connectionId}`),

  startSync: (connectionId: string) => apiPost<void>(`/connections/${connectionId}/sync`, {}),
}
