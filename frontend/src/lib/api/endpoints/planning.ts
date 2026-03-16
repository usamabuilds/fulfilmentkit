import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Plan {
  id: string
  name?: string
  title: string | null
  status: string
  createdAt: string
  result: Record<string, unknown> | null
  assumptions: Record<string, unknown> | null
}

export interface CreatePlanDto {
  from: string
  to: string
  title?: string
}

export const planningApi = {
  list: () => apiGetList<Plan>('/plans'),
  getOne: (planId: string) => apiGet<Plan>(`/plans/${planId}`),
  create: (dto: CreatePlanDto) => apiPost<Plan>('/plans', dto),
}
