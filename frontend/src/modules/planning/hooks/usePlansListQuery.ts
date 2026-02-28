import { useQuery } from "@tanstack/react-query";
import { queryKeys, type ListParams } from "@/lib/api/queryKeys";
import { useWorkspaceStore } from "@/store/workspace-store";
import { listPlans, type ListPlansParams } from "@/modules/planning/api";
import type { PlansListResponse } from "@/modules/planning/types";

export function usePlansListQuery(params: ListPlansParams = {}) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  return useQuery<PlansListResponse>({
    queryKey: queryKeys.plans.list((workspaceId ?? "no-workspace"), params as ListParams),
    queryFn: () => listPlans(params),
    enabled: Boolean(workspaceId),
  });
}
