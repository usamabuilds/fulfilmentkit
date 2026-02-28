import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { fetchDashboardSummary } from "../api";
import { useWorkspaceStore } from "@/store/workspace-store";

export function useDashboardSummary() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  return useQuery({
    queryKey: queryKeys.dashboard.summary(workspaceId ?? "no-workspace"),
    queryFn: () => fetchDashboardSummary(),
    enabled: !!workspaceId,
  });
}
