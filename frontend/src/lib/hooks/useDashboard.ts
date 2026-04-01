import { useQuery } from '@tanstack/react-query'
import {
  dashboardApi,
  type DashboardBreakdownParams,
  type DashboardRepeatPurchaseParams,
  type DashboardStatsParams,
  type DashboardTopSkusParams,
  type DashboardTrendsParams,
} from '@/lib/api/endpoints/dashboard'
import {
  reportsApi,
  type DashboardTargetReportKey,
  type ReportDefinitionDto,
  type ReportRunDto,
} from '@/lib/api/endpoints/reports'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useDashboardStats(params?: DashboardStatsParams, enabled = true) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['dashboard', 'stats', workspaceId, params?.from ?? null, params?.to ?? null],
    queryFn: () => dashboardApi.getStats(params),
    enabled: !!workspaceId && enabled,
  })
}

export function useDashboardTrends(params: DashboardTrendsParams, enabled = true) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: [
      'dashboard',
      'trends',
      workspaceId,
      params.metric,
      params.groupBy,
      params.from ?? null,
      params.to ?? null,
    ],
    queryFn: () => dashboardApi.getTrends(params),
    enabled: !!workspaceId && enabled,
  })
}

export function useDashboardBreakdown(params: DashboardBreakdownParams, enabled = true) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: [
      'dashboard',
      'breakdown',
      workspaceId,
      params.by,
      params.from ?? null,
      params.to ?? null,
    ],
    queryFn: () => dashboardApi.getBreakdown(params),
    enabled: !!workspaceId && enabled,
  })
}

export function useDashboardAlerts(params?: DashboardStatsParams, enabled = true) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: ['dashboard', 'alerts', workspaceId, params?.from ?? null, params?.to ?? null],
    queryFn: () => dashboardApi.getAlerts(params),
    enabled: !!workspaceId && enabled,
  })
}

export function useDashboardTopSkus(params: DashboardTopSkusParams, enabled = true) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: [
      'dashboard',
      'top-skus',
      workspaceId,
      params.sortBy ?? 'revenue',
      params.limit,
      params.from ?? null,
      params.to ?? null,
    ],
    queryFn: () => dashboardApi.getTopSkus(params),
    enabled: !!workspaceId && enabled,
  })
}

export function useDashboardRepeatPurchase(params?: DashboardRepeatPurchaseParams, enabled = true) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)

  return useQuery({
    queryKey: [
      'dashboard',
      'repeat-purchase',
      workspaceId,
      params?.groupBy ?? 'day',
      params?.from ?? null,
      params?.to ?? null,
    ],
    queryFn: () => dashboardApi.getRepeatPurchase(params),
    enabled: !!workspaceId && enabled,
  })
}

export function useDashboardSnapshotReports(enabled = true) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)

  return useQuery({
    queryKey: ['dashboard', 'snapshot', 'reports', workspaceId],
    queryFn: () => reportsApi.list(),
    enabled: !!workspaceId && enabled,
  })
}

interface DashboardSnapshotReportRunParams {
  reportKey: DashboardTargetReportKey
  filters?: Record<string, string | number | string[]>
  enabled?: boolean
}

function getDashboardReportDefinition(
  reports: ReportDefinitionDto[] | undefined,
  key: DashboardTargetReportKey,
): ReportDefinitionDto | null {
  if (!reports) {
    return null
  }

  return reports.find((report) => report.key === key) ?? null
}

export function useDashboardSnapshotReportRun({
  reportKey,
  filters,
  enabled = true,
}: DashboardSnapshotReportRunParams) {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id)
  const reportsQuery = useDashboardSnapshotReports(enabled)
  const reportDefinition = getDashboardReportDefinition(reportsQuery.data?.data.items, reportKey)
  const reportSupportStatus = reportDefinition?.supportStatus ?? null
  const isRunnable = reportSupportStatus !== 'unsupported'

  const runQuery = useQuery({
    queryKey: ['dashboard', 'snapshot', 'run', workspaceId, reportKey, filters ?? null],
    queryFn: () => reportsApi.run(reportKey, { filters }),
    enabled: !!workspaceId && enabled && !!reportDefinition && isRunnable,
  })

  return {
    reportDefinition,
    reportSupportStatus,
    isRunnable,
    reportDefinitionLoading: reportsQuery.isLoading,
    reportDefinitionError: reportsQuery.error,
    runQuery,
    runData: runQuery.data as ReportRunDto<DashboardTargetReportKey> | undefined,
  }
}
