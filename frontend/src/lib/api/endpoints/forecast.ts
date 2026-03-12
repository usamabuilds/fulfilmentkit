import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Forecast {
  id: string
  name: string
  status: string
  createdAt: string
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
  list: () => apiGetList<Forecast>('/forecast'),
  getOne: (forecastId: string) => apiGet<Forecast>(`/forecast/${forecastId}`),
  create: (dto: CreateForecastDto) => apiPost<Forecast>('/forecast', dto),
}
