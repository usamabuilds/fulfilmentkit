import { useQuery } from '@tanstack/react-query'
import { dashboardApi, type DashboardStatsParams } from '@/lib/api/endpoints/dashboard'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useDashboardStats(params?: DashboardStatsParams, enabled = true) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['dashboard', 'stats', workspaceId, params?.from ?? null, params?.to ?? null],
    queryFn: () => dashboardApi.getStats(params),
    enabled: !!workspaceId && enabled,
  })
}
