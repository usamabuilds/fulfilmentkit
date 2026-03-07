import { z } from "zod";

/**
 * BACKEND CONTRACT (NestJS):
 * GET /dashboard/summary returns a plain object (no envelope):
 * {
 *   revenue: string,
 *   orders: number,
 *   units: number,
 *   refundsAmount: string,
 *   feesAmount: string,
 *   cogsAmount: string,
 *   grossMarginAmount: string,
 *   grossMarginPercent: string,
 *   stockoutsCount: number,
 *   lowStockCount: number
 * }
 */
export const DashboardSummarySchema = z.object({
  revenue: z.string(),
  orders: z.number(),
  units: z.number(),

  refundsAmount: z.string(),
  feesAmount: z.string(),

  cogsAmount: z.string(),
  grossMarginAmount: z.string(),
  grossMarginPercent: z.string(),

  stockoutsCount: z.number(),
  lowStockCount: z.number(),
}).passthrough();

/**
 * GET /dashboard/trends returns:
 * { points: Array<{ date: string; value: string | number }> }
 */
export const DashboardTrendsSchema = z.object({
  points: z.array(
    z.object({
      date: z.string(),
      value: z.union([z.string(), z.number()]),
    }),
  ),
}).passthrough();

/**
 * GET /dashboard/breakdown returns:
 * { items: Array<{ key: string; value: string; share: string }> }
 */
export const DashboardBreakdownSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      share: z.string(),
    }),
  ),
}).passthrough();

/**
 * GET /dashboard/alerts returns:
 * {
 *   from: string | null,
 *   to: string | null,
 *   alerts: Array<{ type, level, title, message, count? }>
 * }
 */
export const DashboardAlertSchema = z.object({
  type: z.enum(["stockouts", "low_stock", "margin_leakage", "refund_spikes"]),
  level: z.enum(["critical", "warning", "info"]),
  title: z.string(),
  message: z.string(),
  count: z.number().optional(),
}).passthrough();

export const DashboardAlertsSchema = z.object({
  from: z.string().nullable(),
  to: z.string().nullable(),
  alerts: z.array(DashboardAlertSchema),
}).passthrough();