import { useQuery } from '@tanstack/react-query'
import { inventoryApi, type InventoryListParams } from '@/lib/api/endpoints/inventory'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useInventory(params?: InventoryListParams) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: [
      'inventory',
      workspaceId,
      params?.page ?? 1,
      params?.pageSize ?? 20,
      params?.locationId ?? '',
      params?.search ?? '',
    ],
    queryFn: () => inventoryApi.list(params),
    enabled: !!workspaceId,
  })
}
