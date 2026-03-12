import { apiGet } from '@/lib/api/client'

export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  lowStockItems: number
}

export const dashboardApi = {
  getStats: () => apiGet<DashboardStats>('/dashboard/summary'),
}
