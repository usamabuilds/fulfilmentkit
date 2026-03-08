import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Plan {
  id: string
  name: string
  status: string
  createdAt: string
}

export interface CreatePlanDto {
  name: string
}

export const planningApi = {
  list: (workspaceId: string) => apiGetList<Plan>(`/workspaces/${workspaceId}/plans`),

  getOne: (workspaceId: string, planId: string) => apiGet<Plan>(`/workspaces/${workspaceId}/plans/${planId}`),

  create: (workspaceId: string, dto: CreatePlanDto) => apiPost<Plan>(`/workspaces/${workspaceId}/plans`, dto),
}
