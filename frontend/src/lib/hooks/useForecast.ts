import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { forecastApi } from '@/lib/api/endpoints/forecast'
import type { CreateForecastDto } from '@/lib/api/endpoints/forecast'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useForecasts() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['forecasts', workspaceId],
    queryFn: () => forecastApi.list(),
    enabled: !!workspaceId,
  })
}

export function useForecast(forecastId: string) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['forecasts', workspaceId, forecastId],
    queryFn: () => forecastApi.getOne(forecastId),
    enabled: !!workspaceId && !!forecastId,
  })
}

export function useCreateForecast() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateForecastDto) => forecastApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts', workspaceId] })
    },
  })
}
