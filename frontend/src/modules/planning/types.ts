import type { z } from "zod";
import type {
  PlanningOutputSchema,
  PlanSchema,
  PlansListResponseSchema,
  PlanDetailResponseSchema,
  PlanningOutputResponseSchema,
  CreatePlanResponseSchema,
} from "@/modules/planning/schemas";

export type PlanningOutput = z.infer<typeof PlanningOutputSchema>;
export type Plan = z.infer<typeof PlanSchema>;

export type PlansListResponse = z.infer<typeof PlansListResponseSchema>;
export type PlanDetailResponse = z.infer<typeof PlanDetailResponseSchema>;
export type PlanningOutputResponse = z.infer<typeof PlanningOutputResponseSchema>;
export type CreatePlanResponse = z.infer<typeof CreatePlanResponseSchema>;
