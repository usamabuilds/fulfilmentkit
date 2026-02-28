import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { parseOrThrow } from "@/lib/validation/zod";
import {
  PlansListResponseSchema,
  PlanDetailResponseSchema,
  PlanningOutputSchema,
} from "@/modules/planning/schemas";
import type { PlanningOutput, Plan, PlansListResponse } from "@/modules/planning/types";

/**
 * Planning module API (LOCKED rules):
 * - All calls go through apiClient
 * - Strict parsing for critical planning outputs
 * - Do not invent payloads
 *
 * Confirmed backend endpoints:
 * - GET /plans (pagination + optional createdAt from/to)
 * - GET /plans/:id
 * - POST /plans returns result + assumptions in payload
 */

export type ListPlansParams = {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
};

export async function listPlans(params: ListPlansParams = {}): Promise<PlansListResponse> {
  const data = await apiClient.get<unknown>(endpoints.plans.list, params);
  return parseOrThrow(
    PlansListResponseSchema,
    data,
    { module: "planning", operation: "listPlans" },
  );
}

export async function getPlan(planId: string): Promise<Plan> {
  const data = await apiClient.get<unknown>(endpoints.plans.detail(planId));
  const parsed = parseOrThrow(
    PlanDetailResponseSchema,
    data,
    { module: "planning", operation: "getPlan" },
  );
  return parsed.data;
}

/**
 * Extract and strictly validate the AI planning output shape from a Plan record.
 * Backend returns structured blocks in result (with assumptions separately).
 * This helper ensures critical planning screens never render unknown shapes.
 */
export function parsePlanningOutputFromPlan(plan: Plan): PlanningOutput {
  return parseOrThrow(
    PlanningOutputSchema,
    plan.result,
    { module: "planning", operation: "parsePlanningOutputFromPlan" },
  );
}
