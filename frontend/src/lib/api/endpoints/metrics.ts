import { apiGetList, apiPost } from '@/lib/api/client'

export interface DailyMetric {
  id: string
  date: string
  revenue: number
  orders: number
  unitsSold: number
  currency: string
}

export interface MetricsListParams {
  from: string
  to: string
}

export const metricsApi = {
  list: (params: MetricsListParams) => {
    const query = new URLSearchParams()
    query.set('from', params.from)
    query.set('to', params.to)
    return apiGetList<DailyMetric>(`/metrics/daily?${query}`)
  },
  compute: () => apiPost<void>('/metrics/compute-daily', {}),
}
