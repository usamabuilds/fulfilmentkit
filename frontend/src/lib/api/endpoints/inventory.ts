import { apiGetList } from '@/lib/api/client'

export interface InventoryItem {
  id: string
  sku: string
  name: string
  quantity: number
  lowStockThreshold: number
  createdAt: string
}

export const inventoryApi = {
  list: (workspaceId: string, params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    return apiGetList<InventoryItem>(`/workspaces/${workspaceId}/inventory?${query}`)
  },
}
