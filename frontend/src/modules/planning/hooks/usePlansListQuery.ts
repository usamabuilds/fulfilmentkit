import { useQuery } from "@tanstack/react-query";
import { queryKeys, type ListParams } from "@/lib/api/queryKeys";
import { listPlans, type ListPlansParams } from "@/modules/planning/api";
import type { PlansListResponse } from "@/modules/planning/types";

function getWorkspaceId(): string | null {
  return localStorage.getItem("fk_workspace_id");
}

export function usePlansListQuery(params: ListPlansParams = {}) {
  const workspaceId = getWorkspaceId();

  return useQuery<PlansListResponse>({
    queryKey: workspaceId
      ? queryKeys.plans.list(workspaceId, params as ListParams)
      : (["planning", "no-workspace", "plans", "list", params] as const),
    queryFn: () => listPlans(params),
    enabled: Boolean(workspaceId),
  });
}