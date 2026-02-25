import { apiClient } from "@/lib/api/client";
import { parseOrThrow } from "@/lib/validation/zod";
import {
  DashboardSummarySchema,
  DashboardTrendsSchema,
  DashboardBreakdownSchema,
  DashboardAlertsSchema,
} from "@/modules/dashboard/schemas";

export async function fetchDashboardSummary() {
  const data = await apiClient.get("/dashboard/summary");
  return parseOrThrow(
    DashboardSummarySchema,
    data,
    { module: "dashboard", operation: "fetchDashboardSummary" },
  );
}

export function parseDashboardTrends(data: unknown) {
  return parseOrThrow(
    DashboardTrendsSchema,
    data,
    { module: "dashboard", operation: "parseDashboardTrends" },
  );
}

export function parseDashboardBreakdown(data: unknown) {
  return parseOrThrow(
    DashboardBreakdownSchema,
    data,
    { module: "dashboard", operation: "parseDashboardBreakdown" },
  );
}

export function parseDashboardAlerts(data: unknown) {
  return parseOrThrow(
    DashboardAlertsSchema,
    data,
    { module: "dashboard", operation: "parseDashboardAlerts" },
  );
}