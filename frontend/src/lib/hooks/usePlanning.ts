import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planningApi } from '@/lib/api/endpoints/planning'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function usePlans() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: ['plans', workspaceId],
    queryFn: () => planningApi.list(),
    enabled: !!workspaceId,
  })
}

export function usePlan(planId: string) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: ['plans', workspaceId, planId],
    queryFn: () => planningApi.getOne(planId),
    enabled: !!workspaceId && !!planId,
  })
}

export function useCreatePlan() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: { name: string }) => planningApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', workspaceId] })
    },
  })
}
