import type { z } from "zod";
import type { DashboardSummarySchema } from "@/modules/dashboard/schemas";

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;