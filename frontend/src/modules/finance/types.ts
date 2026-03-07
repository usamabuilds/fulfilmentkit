import type { z } from "zod";
import type { FinanceSummarySchema } from "@/modules/finance/schemas";

export type FinanceSummary = z.infer<typeof FinanceSummarySchema>;