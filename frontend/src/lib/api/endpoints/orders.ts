import type { ApiListResponse, ApiResponse } from '@/lib/api/types'
import { apiGet, apiGetList } from '@/lib/api/client'

export interface Order {
  id: string
  externalId: string
  externalRef: string | null
  orderNumber: string | null
  status: string
  channel: string
  orderedAt: string
  currency: string
  subtotal: string
  tax: string
  shipping: string
  total: string
  totalAmount: number
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  lineKey: string
  productId: string | null
  sku: string | null
  name: string | null
  quantity: number
  unitPrice: string
  total: string
}

export interface OrderDetail extends Order {
  feesTotal: string
  refundsTotal: string
  cogsTotal: string
  items: OrderItem[]
}

interface RawOrder {
  id: string
  externalRef: string | null
  orderNumber: string | null
  status: string
  channel: string
  orderedAt: string
  currency: string
  subtotal: string
  tax: string
  shipping: string
  total: string
  createdAt: string
  updatedAt: string
}

interface RawOrderDetail extends RawOrder {
  feesTotal: string
  refundsTotal: string
  cogsTotal: string
  items: OrderItem[]
}

export interface OrdersListParams {
  page?: number
  pageSize?: number
  from?: string
  to?: string
  status?: string
  channel?: string
  search?: string
}


export const ordersApiPaths = {
  list: (queryString: string) => `/orders?${queryString}`,
  getOne: (orderId: string) => `/orders/${orderId}`,
}

function toOrder(raw: RawOrder): Order {
  return {
    ...raw,
    externalId: raw.orderNumber ?? raw.externalRef ?? raw.id,
    totalAmount: Number.parseFloat(raw.total) || 0,
  }
}

export const ordersApi = {
  list: async (params?: OrdersListParams): Promise<ApiListResponse<Order>> => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.pageSize) query.set('pageSize', String(params.pageSize))
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)
    if (params?.status) query.set('status', params.status)
    if (params?.channel) query.set('channel', params.channel)
    if (params?.search) query.set('search', params.search)

    const response = await apiGetList<RawOrder>(ordersApiPaths.list(query.toString()))
    return {
      ...response,
      data: {
        ...response.data,
        items: response.data.items.map(toOrder),
      },
    }
  },

  getOne: async (orderId: string): Promise<ApiResponse<OrderDetail>> => {
    const response = await apiGet<RawOrderDetail>(ordersApiPaths.getOne(orderId))
    return {
      ...response,
      data: {
        ...toOrder(response.data),
        feesTotal: response.data.feesTotal,
        refundsTotal: response.data.refundsTotal,
        cogsTotal: response.data.cogsTotal,
        items: response.data.items,
      },
    }
  },
}
