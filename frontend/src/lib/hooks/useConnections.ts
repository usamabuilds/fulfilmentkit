import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { connectionsApi } from '@/lib/api/endpoints/connections'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useConnections() {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)

  return useQuery({
    queryKey: ['connections', workspaceId],
    queryFn: () => connectionsApi.list(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useStartSync(connectionId: string) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => connectionsApi.startSync(workspaceId!, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', workspaceId] })
    },
  })
}
