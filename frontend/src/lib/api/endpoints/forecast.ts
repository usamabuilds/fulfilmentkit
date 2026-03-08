import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export interface Forecast {
  id: string
  name: string
  status: string
  createdAt: string
}

export interface CreateForecastDto {
  name: string
}

export const forecastApi = {
  list: (workspaceId: string) => apiGetList<Forecast>(`/workspaces/${workspaceId}/forecasts`),

  getOne: (workspaceId: string, forecastId: string) =>
    apiGet<Forecast>(`/workspaces/${workspaceId}/forecasts/${forecastId}`),

  create: (workspaceId: string, dto: CreateForecastDto) =>
    apiPost<Forecast>(`/workspaces/${workspaceId}/forecasts`, dto),
}
