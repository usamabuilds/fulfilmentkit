import { apiGetList } from '@/lib/api/client'

export interface InventoryItem {
  sku: string
  name: string
  locationId: string
  locationCode: string
  onHand: number
  lowStockThreshold?: number | null
  outOfStockThreshold?: number | null
}

export const inventoryApi = {
  list: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    return apiGetList<InventoryItem>(`/inventory?${query}`)
  },
}
