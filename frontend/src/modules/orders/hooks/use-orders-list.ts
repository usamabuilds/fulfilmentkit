import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/store/workspace-store";
import { fetchOrdersList, type OrdersListQuery } from "../api";

export function useOrdersList(query: OrdersListQuery) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  return useQuery({
    queryKey: [
      "orders",
      "list",
      workspaceId,
      query.from ?? null,
      query.to ?? null,
      query.status ?? null,
      query.channel ?? null,
      query.search ?? null,
      query.page ?? 1,
      query.pageSize ?? 20,
    ],
    queryFn: () => fetchOrdersList(query),
    enabled: !!workspaceId,
  });
}