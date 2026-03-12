import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Plan {
  id: string
  name: string
  status: string
  createdAt: string
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
