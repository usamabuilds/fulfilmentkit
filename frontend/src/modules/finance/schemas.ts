import { z } from "zod";

/**
 * Finance summary is based on backend DashboardService.summary() shape.
 * Backend returns a plain object (not necessarily wrapped).
 *
 * We keep this strict to prevent silent UI lies.
 * Decimal values are strings.
 */
export const FinanceSummarySchema = z.object({
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
 * Optional standard API envelope (some endpoints may wrap).
 * { success: boolean, data: ... }
 */
export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
  });

export const FinanceSummaryEnvelopeSchema = ApiEnvelopeSchema(FinanceSummarySchema);

/**
 * Allow either:
 * - raw object (current backend dashboard summary style)
 * - envelope { success, data }
 */
export const FinanceSummaryResponseSchema = z.union([
  FinanceSummarySchema,
  FinanceSummaryEnvelopeSchema,
]);