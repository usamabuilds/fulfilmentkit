import { parseOrThrow } from "@/lib/validation/zod";
import {
  FinanceSummaryEnvelopeSchema,
  FinanceSummaryResponseSchema,
  FinanceSummarySchema,
} from "@/modules/finance/schemas";
import type { FinanceSummary } from "@/modules/finance/types";

/**
 * Finance module API (LOCKED rules):
 * - Strict parsing for critical finance screens
 * - Do not invent backend endpoints
 *
 * This file only provides parsing utilities for now.
 * Fetch calls will be added only after confirming backend routes.
 */

export function parseFinanceSummary(data: unknown): FinanceSummary {
  return parseOrThrow(
    FinanceSummarySchema,
    data,
    { module: "finance", operation: "parseFinanceSummary" },
  );
}

export function parseFinanceSummaryEnvelope(data: unknown) {
  return parseOrThrow(
    FinanceSummaryEnvelopeSchema,
    data,
    { module: "finance", operation: "parseFinanceSummaryEnvelope" },
  );
}

export function parseFinanceSummaryResponse(data: unknown) {
  return parseOrThrow(
    FinanceSummaryResponseSchema,
    data,
    { module: "finance", operation: "parseFinanceSummaryResponse" },
  );
}