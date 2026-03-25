import { useQuery } from '@tanstack/react-query'
import { locationsApi } from '@/lib/api/endpoints/locations'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useLocations() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: ['locations', workspaceId],
    queryFn: () => locationsApi.list(),
    enabled: !!workspaceId,
  })
}
