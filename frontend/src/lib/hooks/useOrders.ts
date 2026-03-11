import { useQuery } from '@tanstack/react-query'
import { ordersApi, type OrdersListParams } from '@/lib/api/endpoints/orders'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useOrders(params?: OrdersListParams) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['orders', workspaceId, params],
    queryFn: () => ordersApi.list(workspaceId!, params),
    enabled: !!workspaceId,
  })
}

export function useOrder(orderId: string) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['orders', workspaceId, orderId],
    queryFn: () => ordersApi.getOne(workspaceId!, orderId),
    enabled: !!workspaceId && !!orderId,
  })
}
