import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { useWorkspaceStore } from "@/store/workspace-store";
import { getPlan } from "@/modules/planning/api";
import type { Plan } from "@/modules/planning/types";

export function usePlanDetailQuery(planId: string) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  return useQuery<Plan>({
    queryKey: queryKeys.plans.detail((workspaceId ?? "no-workspace"), planId),
    queryFn: () => getPlan(planId),
    enabled: Boolean(workspaceId) && Boolean(planId),
  });
}
