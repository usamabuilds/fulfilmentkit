import type { z } from "zod";
import { OrderListItemSchema, OrdersListResponseSchema } from "./schemas";

export type OrderListItem = z.infer<typeof OrderListItemSchema>;
export type OrdersListResponse = z.infer<typeof OrdersListResponseSchema>;