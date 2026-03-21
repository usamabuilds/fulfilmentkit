import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectionsApi,
  type ConnectionPlatform,
  type StartConnectionPayload,
} from '@/lib/api/endpoints/connections'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useConnections() {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)

  return useQuery({
    queryKey: ['connections', workspaceId],
    queryFn: () => connectionsApi.list(),
    enabled: !!workspaceId,
  })
}

export function useStartConnection(platform: ConnectionPlatform) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload?: StartConnectionPayload) => connectionsApi.start(platform, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', workspaceId] })
    },
  })
}

export function useStartSync(connectionId: string) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => connectionsApi.startSync(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', workspaceId] })
    },
  })
}
