import { apiGetList, apiPost } from '@/lib/api/client'

export interface DailyMetric {
  id: string
  date: string
  revenue: number
  orders: number
  unitsSold: number
  currency: string
}

export const metricsApi = {
  list: (workspaceId: string, params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    return apiGetList<DailyMetric>(`/workspaces/${workspaceId}/metrics/daily?${query}`)
  },

  compute: (workspaceId: string) =>
    apiPost<void>(`/workspaces/${workspaceId}/metrics/compute`, {}),
}
