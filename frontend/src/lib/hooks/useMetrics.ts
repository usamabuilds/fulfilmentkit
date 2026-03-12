import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { metricsApi } from '@/lib/api/endpoints/metrics'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useMetrics(_params?: { page?: number; pageSize?: number }) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 30)

  const fromStr = from.toISOString().split('T')[0]
  const toStr = today.toISOString().split('T')[0]

  return useQuery({
    queryKey: ['metrics', workspaceId, fromStr, toStr],
    queryFn: () => metricsApi.list({ from: fromStr, to: toStr }),
    enabled: !!workspaceId,
  })
}

export function useComputeMetrics() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => metricsApi.compute(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', workspaceId] })
    },
  })
}
