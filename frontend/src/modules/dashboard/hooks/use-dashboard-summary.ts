import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../api";
import { useWorkspaceStore } from "@/store/workspace-store";

export function useDashboardSummary() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  return useQuery({
    queryKey: ["dashboard", "summary", workspaceId],
    queryFn: () => fetchDashboardSummary(),
    enabled: !!workspaceId,
  });
}