import { apiGet } from '@/lib/api/client'

export interface DashboardStats {
  revenue: string
  orders: number
  units: number
  refundsAmount: string
  refundRatePercent: string
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

export type DashboardTopSkuSortBy = 'revenue' | 'units' | 'refunds' | 'margin'

export interface DashboardTopSkusParams {
  from?: string
  to?: string
  limit: number
  sortBy?: DashboardTopSkuSortBy
}

export interface DashboardTopSkuRow {
  sku: string
  name: string
  revenue: string
  units: number
  refunds: string
  fees: string
  margin: string
  share: string
}

export interface DashboardTopSkus {
  rows: DashboardTopSkuRow[]
}

export type DashboardAlertType = 'stockouts' | 'low_stock' | 'margin_leakage' | 'refund_spikes'

export type DashboardAlertLevel = 'critical' | 'warning' | 'info'

export interface DashboardAlert {
  type: DashboardAlertType
  level: DashboardAlertLevel
  title: string
  message: string
  count?: number
}

export interface DashboardAlertsResponse {
  from: string
  to: string
  alerts: DashboardAlert[]
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
  getAlerts: (params?: DashboardStatsParams) => {
    const query = new URLSearchParams()
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)

    const queryString = query.toString()
    const path = queryString ? `/dashboard/alerts?${queryString}` : '/dashboard/alerts'
    return apiGet<DashboardAlertsResponse>(path)
  },
  getTopSkus: (params: DashboardTopSkusParams) => {
    const query = new URLSearchParams()
    query.set('limit', String(params.limit))
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)

    const queryString = query.toString()
    const path = queryString ? `/dashboard/top-skus?${queryString}` : '/dashboard/top-skus'
    return apiGet<DashboardTopSkus>(path)
  },
}
