import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api/endpoints/inventory'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useInventory(params?: { page?: number; pageSize?: number }) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: ['inventory', workspaceId, params],
    queryFn: () => inventoryApi.list(params),
    enabled: !!workspaceId,
  })
}
