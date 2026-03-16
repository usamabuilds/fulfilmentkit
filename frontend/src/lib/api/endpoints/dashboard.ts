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

export interface DashboardTrendsParams {
  metric: string
  groupBy: string
  from?: string
  to?: string
}

export interface DashboardTrendPoint {
  date: string
  value: string | number
}

export interface DashboardTrends {
  points: DashboardTrendPoint[]
}

export type DashboardBreakdownBy = 'channel' | 'country' | 'sku'

export interface DashboardBreakdownParams {
  by: DashboardBreakdownBy
  from?: string
  to?: string
}

export interface DashboardBreakdownItem {
  key: string
  value: string
  share: string
}

export interface DashboardBreakdown {
  items: DashboardBreakdownItem[]
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
  getTrends: (params: DashboardTrendsParams) => {
    const query = new URLSearchParams()
    query.set('metric', params.metric)
    query.set('groupBy', params.groupBy)
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)

    const queryString = query.toString()
    const path = queryString ? `/dashboard/trends?${queryString}` : '/dashboard/trends'
    return apiGet<DashboardTrends>(path)
  },
  getBreakdown: (params: DashboardBreakdownParams) => {
    const query = new URLSearchParams()
    query.set('by', params.by)
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)

    const queryString = query.toString()
    const path = queryString ? `/dashboard/breakdown?${queryString}` : '/dashboard/breakdown'
    return apiGet<DashboardBreakdown>(path)
  },
}
