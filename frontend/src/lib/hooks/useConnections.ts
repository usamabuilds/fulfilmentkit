import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CompleteConnectionPayload,
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
    mutationFn: (payload?: StartConnectionPayload<ConnectionPlatform>) =>
      platform === 'shopify'
        ? connectionsApi.start('shopify', payload as StartConnectionPayload<'shopify'>)
        : connectionsApi.start(platform, payload as StartConnectionPayload<typeof platform>),
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

export function useCompleteConnection(platform: ConnectionPlatform) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload?: CompleteConnectionPayload<ConnectionPlatform>) =>
      platform === 'woocommerce'
        ? connectionsApi.complete(
            'woocommerce',
            payload as CompleteConnectionPayload<'woocommerce'>
          )
        : connectionsApi.complete(
            platform,
            payload as CompleteConnectionPayload<typeof platform>
          ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', workspaceId] })
    },
  })
}
