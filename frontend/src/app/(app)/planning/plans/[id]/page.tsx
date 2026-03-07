"use client";

import * as React from "react";
import { PageFrame } from "@/components/patterns/PageFrame";
import { Card } from "@/components/patterns/Card";
import { AlertCard } from "@/components/patterns/AlertCard";
import { usePlanDetailQuery } from "@/modules/planning/hooks/usePlanDetailQuery";
import { parsePlanningOutputFromPlan } from "@/modules/planning/api";
import { isApiError } from "@/lib/api/errors";

export default function PlanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: plan, isLoading, error } = usePlanDetailQuery(params.id);

  const parsedOutput = React.useMemo(() => {
    if (!plan) return null;

    try {
      const out = parsePlanningOutputFromPlan(plan);
      return { ok: true as const, data: out };
    } catch (e) {
      return { ok: false as const, error: e };
    }
  }, [plan]);

  return (
    <PageFrame title="Plan Detail" subtitle={`planning/plans/${params.id}`}>
      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <div className="fk-body fk-muted">Loading plan...</div>
          </Card>
        ) : null}

        {error ? (
          <AlertCard
            tone="danger"
            title="Failed to load plan"
            description={
              isApiError(error)
                ? error.message
                : "Something went wrong. Please retry."
            }
          />
        ) : null}

        {!isLoading && !error && plan ? (
          <div className="space-y-6">
            <Card>
              <div className="text-xs font-medium fk-muted">Plan ID</div>
              <div className="mt-2 fk-mono">{plan.id}</div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium fk-muted">Created</div>
                  <div className="mt-2 fk-mono">{plan.createdAt}</div>
                </div>
                <div>
                  <div className="text-xs font-medium fk-muted">Updated</div>
                  <div className="mt-2 fk-mono">{plan.updatedAt}</div>
                </div>
              </div>
            </Card>

            {parsedOutput ? (
              parsedOutput.ok ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <div className="text-sm font-semibold">Status</div>
                    <ul className="mt-3 space-y-2">
                      {parsedOutput.data.statusBullets.map((x, i) => (
                        <li key={i} className="fk-body">
                          {x}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card>
                    <div className="text-sm font-semibold">Top risks</div>
                    <ul className="mt-3 space-y-2">
                      {parsedOutput.data.topRisks.map((x, i) => (
                        <li key={i} className="fk-body">
                          {x}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card>
                    <div className="text-sm font-semibold">Opportunities</div>
                    <ul className="mt-3 space-y-2">
                      {parsedOutput.data.opportunities.map((x, i) => (
                        <li key={i} className="fk-body">
                          {x}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card>
                    <div className="text-sm font-semibold">Next 7 days plan</div>
                    <ul className="mt-3 space-y-2">
                      {parsedOutput.data.next7DaysPlan.map((x, i) => (
                        <li key={i} className="fk-body">
                          {x}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card className="lg:col-span-2">
                    <div className="text-sm font-semibold">Assumptions</div>
                    <ul className="mt-3 space-y-2">
                      {parsedOutput.data.assumptions.map((x, i) => (
                        <li key={i} className="fk-body">
                          {x}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ) : (
                <AlertCard
                  tone="danger"
                  title="Unexpected plan output shape"
                  description="We received unexpected data from the server. Please retry."
                  meta="Validation error"
                />
              )
            ) : null}
          </div>
        ) : null}

        {!isLoading && !error && !plan ? (
          <AlertCard
            tone="warning"
            title="Plan not available"
            description="No plan data was returned."
          />
        ) : null}
      </div>
    </PageFrame>
  );
}