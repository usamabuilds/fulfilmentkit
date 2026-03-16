import { apiGet } from '@/lib/api/client'

export interface DashboardStats {
  revenue: string
  orders: number
  units: number
  refundsAmount: string
  feesAmount: string
  grossMarginAmount: string
  grossMarginPercent: string
  stockoutsCount: number
  lowStockCount: number
}

export interface DashboardStatsParams {
  from?: string
  to?: string
}

export const dashboardApi = {
  getStats: (params?: DashboardStatsParams) => {
    const query = new URLSearchParams()
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)

    const queryString = query.toString()
    const path = queryString ? `/dashboard/summary?${queryString}` : '/dashboard/summary'
    return apiGet<DashboardStats>(path)
  },
}
