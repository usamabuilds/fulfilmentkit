import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/queryKeys";
import { useWorkspaceStore } from "@/store/workspace-store";
import { fetchOrdersList, type OrdersListQuery } from "../api";

export function useOrdersList(query: OrdersListQuery) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  const normalizedParamsObject = {
    from: query.from ?? null,
    to: query.to ?? null,
    status: query.status ?? null,
    channel: query.channel ?? null,
    search: query.search ?? null,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  };

  return useQuery({
    queryKey: queryKeys.orders.list(workspaceId ?? "no-workspace", normalizedParamsObject),
    queryFn: () => fetchOrdersList(query),
    enabled: !!workspaceId,
  });
}
