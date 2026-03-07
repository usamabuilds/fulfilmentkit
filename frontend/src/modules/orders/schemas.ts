import { z } from "zod";

/**
 * Orders module schemas
 * Mirrors backend contract for:
 * GET /orders
 *
 * Backend selects:
 * id, externalRef, orderNumber, status, channel, orderedAt, currency,
 * subtotal, tax, shipping, total, createdAt, updatedAt
 *
 * Notes:
 * - Dates arrive as ISO strings over JSON.
 * - Prisma Decimal fields serialize to string in JSON.
 */

export const OrderListItemSchema = z.object({
  id: z.string().uuid(),
  externalRef: z.string().nullable(),
  orderNumber: z.string().nullable(),
  status: z.string(),
  channel: z.string().nullable(),
  orderedAt: z.string(),
  currency: z.string(),
  subtotal: z.string(),
  tax: z.string(),
  shipping: z.string(),
  total: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OrdersListResponseSchema = z.object({
  items: z.array(OrderListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});