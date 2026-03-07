"use client";

import * as React from "react";
import { PageFrame } from "@/components/patterns/PageFrame";
import { Card } from "@/components/patterns/Card";
import { FkError } from "@/components/fk-error";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import { DashboardSummaryMetrics } from "@/modules/dashboard/components/DashboardSummaryMetrics";

export default function DashboardOverviewPage() {
  const { data, isLoading, error } = useDashboardSummary();

  return (
    <PageFrame
      title="Dashboard Overview"
      subtitle="Thin route. Fetching + parsing lives in src/modules/dashboard."
    >
      {isLoading ? (
        <Card>
          <p className="fk-body text-muted-foreground">Loading summary...</p>
        </Card>
      ) : error ? (
        <FkError error={error} />
      ) : !data ? (
        <Card>
          <p className="fk-body text-muted-foreground">No data available.</p>
        </Card>
      ) : (
        <DashboardSummaryMetrics data={data} />
      )}
    </PageFrame>
  );
}