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

export interface InventoryListParams {
  page?: number
  pageSize?: number
  locationId?: string
}

export const inventoryApi = {
  list: (params?: InventoryListParams) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.locationId) query.set('locationId', params.locationId)
    return apiGetList<InventoryItem>(`/inventory?${query}`)
  },
}
