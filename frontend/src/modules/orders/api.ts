import { apiClient } from "@/lib/api/client";
import { OrdersListResponseSchema } from "./schemas";

export type OrdersListQuery = {
  from?: string;
  to?: string;
  status?: string;
  channel?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

function toQueryParams(q: OrdersListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  if (q.status) params.status = q.status;
  if (q.channel) params.channel = q.channel;
  if (q.search) params.search = q.search;
  if (typeof q.page === "number") params.page = q.page;
  if (typeof q.pageSize === "number") params.pageSize = q.pageSize;

  return params;
}

export async function fetchOrdersList(query: OrdersListQuery) {
  const res = await apiClient.get("/orders", toQueryParams(query));
  return OrdersListResponseSchema.parse(res);
}