import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Workspace {
  id: string
  name: string
  createdAt: string
}

export interface CreateWorkspaceDto {
  name: string
}

export const workspacesApi = {
  list: () => apiGetList<Workspace>('/workspaces'),

  create: (dto: CreateWorkspaceDto) => apiPost<Workspace>('/workspaces', dto),

  getOne: (id: string) => apiGet<Workspace>(`/workspaces/${id}`),
}
