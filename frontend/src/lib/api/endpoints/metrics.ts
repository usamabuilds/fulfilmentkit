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
  list: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    return apiGetList<DailyMetric>(`/metrics/daily?${query}`)
  },

  compute: () => apiPost<void>('/metrics/compute-daily', {}),
}
