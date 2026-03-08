import { apiGet, apiGetList } from '@/lib/api/client'

export interface Order {
  id: string
  externalId: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
}

export const ordersApi = {
  list: (workspaceId: string, params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    return apiGetList<Order>(`/workspaces/${workspaceId}/orders?${query}`)
  },

  getOne: (workspaceId: string, orderId: string) =>
    apiGet<Order>(`/workspaces/${workspaceId}/orders/${orderId}`),
}
