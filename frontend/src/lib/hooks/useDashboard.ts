import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/endpoints/dashboard'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useDashboardStats() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['dashboard', 'stats', workspaceId],
    queryFn: () => dashboardApi.getStats(),
    enabled: !!workspaceId,
  })
}
