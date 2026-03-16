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

export const dashboardApi = {
  getStats: () => apiGet<DashboardStats>('/dashboard/summary'),
}
