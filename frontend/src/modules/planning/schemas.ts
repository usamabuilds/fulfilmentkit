import { z } from "zod";

/**
 * Planning AI output blocks (from backend AiToolsetService)
 * Backend returns structured blocks:
 * - statusBullets
 * - topRisks
 * - opportunities
 * - next7DaysPlan
 * - assumptions
 */
export const PlanningOutputSchema = z.object({
  statusBullets: z.array(z.string()),
  topRisks: z.array(z.string()),
  opportunities: z.array(z.string()),
  next7DaysPlan: z.array(z.string()),
  assumptions: z.array(z.string()),
});

/**
 * Plan row/detail core fields
 * Keep this tolerant to avoid breaking on new backend fields.
 * Only parse fields we actually rely on.
 *
 * Note: resultJson and assumptionsJson are stored on the Plan record.
 */
export const PlanSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // Backend may include status fields or metadata later, so allow passthrough.
  resultJson: z.unknown().optional(),
  assumptionsJson: z.unknown().optional(),
}).passthrough();

/**
 * Common API envelope (what we expect many endpoints to return):
 * { success: boolean, data: ... }
 * We keep this available for planning module usage.
 */
export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
  });

/**
 * List response shape:
 * Often: { success: true, data: { items: [...], page, pageSize, total } }
 * If backend differs, we will adjust once we confirm real payload.
 */
export const PlansListDataSchema = z.object({
  items: z.array(PlanSchema),
  page: z.number().int().nonnegative().optional(),
  pageSize: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
}).passthrough();

export const PlansListResponseSchema = ApiEnvelopeSchema(PlansListDataSchema);

export const PlanDetailResponseSchema = ApiEnvelopeSchema(PlanSchema);

/**
 * Some endpoints may return planning output directly as "data".
 * If backend wraps it inside resultJson later, we will validate at the api.ts level.
 */
export const PlanningOutputResponseSchema = ApiEnvelopeSchema(PlanningOutputSchema);