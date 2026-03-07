import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { getPlan } from "@/modules/planning/api";
import type { Plan } from "@/modules/planning/types";

function getWorkspaceId(): string | null {
  return localStorage.getItem("fk_workspace_id");
}

export function usePlanDetailQuery(planId: string) {
  const workspaceId = getWorkspaceId();

  return useQuery<Plan>({
    queryKey: workspaceId
      ? queryKeys.planning.planDetail(workspaceId, planId)
      : (["planning", "no-workspace", "plans", "detail", planId] as const),
    queryFn: () => getPlan(planId),
    enabled: Boolean(workspaceId) && Boolean(planId),
  });
}