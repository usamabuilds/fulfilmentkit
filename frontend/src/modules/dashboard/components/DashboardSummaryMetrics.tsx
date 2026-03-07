"use client";

import * as React from "react";
import { MetricCard } from "@/components/patterns/MetricCard";
import type { DashboardSummary } from "../types";

function formatMoneyString(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentString(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return `${n.toFixed(2)}%`;
}

export function DashboardSummaryMetrics({ data }: { data: DashboardSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Revenue" value={formatMoneyString(data.revenue)} />
      <MetricCard label="Orders" value={data.orders} />
      <MetricCard label="Units" value={data.units} />
      <MetricCard
        label="Gross margin %"
        value={formatPercentString(data.grossMarginPercent)}
      />

      <MetricCard label="Refunds" value={formatMoneyString(data.refundsAmount)} />
      <MetricCard label="Fees" value={formatMoneyString(data.feesAmount)} />
      <MetricCard label="Stockouts" value={data.stockoutsCount} />
      <MetricCard label="Low stock" value={data.lowStockCount} />
    </div>
  );
}