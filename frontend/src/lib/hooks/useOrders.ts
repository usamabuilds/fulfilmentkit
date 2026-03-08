import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/lib/api/endpoints/orders'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useOrders(params?: { page?: number; pageSize?: number }) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['orders', workspaceId, params],
    queryFn: () => ordersApi.list(workspaceId!, params),
    enabled: !!workspaceId,
  })
}
