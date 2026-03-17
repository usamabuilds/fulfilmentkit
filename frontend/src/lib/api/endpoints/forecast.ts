import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export type ForecastListLevel = 'WORKSPACE' | 'SKU'
export type ForecastDetailLevel = 'workspace' | 'sku'

export interface ForecastPointDto {
  day: string
  revenue: number | null
  orders: number | null
  units: number | null
}

export interface ForecastSummaryDto {
  revenue: number | null
  orders: number | null
  units: number | null
}

export interface ForecastRangeDto {
  from: string
  to: string
}

export interface ForecastListItemDto {
  id: string
  createdAt: string
  updatedAt: string
  level: ForecastListLevel
  method: string
  horizonDays: number
  productId: string | null
}

export interface ForecastDetailDto {
  id: string
  createdAt: string
  updatedAt: string
  level: ForecastDetailLevel
  sku?: string
  productId?: string
  method: string
  range: ForecastRangeDto
  horizonDays: number
  assumptions: Record<string, unknown>
  forecast: {
    totals: ForecastSummaryDto
    daily: ForecastPointDto[]
  }
}

export interface CreateForecastDto {
  from: string
  to: string
  horizonDays?: number
  sku?: string
  productId?: string
  method?: string
}

export const forecastApi = {
  list: () => apiGetList<ForecastListItemDto>('/forecast'),
  getOne: (forecastId: string) => apiGet<ForecastDetailDto>(`/forecast/${forecastId}`),
  create: (dto: CreateForecastDto) => apiPost<ForecastDetailDto>('/forecast', dto),
}
