import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { metricsApi } from '@/lib/api/endpoints/metrics'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useMetrics(params?: { page?: number; pageSize?: number }) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: ['metrics', workspaceId, params],
    queryFn: () => metricsApi.list(workspaceId!, params),
    enabled: !!workspaceId,
  })
}

export function useComputeMetrics() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => metricsApi.compute(workspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', workspaceId] })
    },
  })
}
