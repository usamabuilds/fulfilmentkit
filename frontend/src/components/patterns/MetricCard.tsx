import * as React from "react";
import { Card } from "@/components/patterns/Card";

export type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: {
    direction: "up" | "down" | "flat";
    value: string;
  };
  right?: React.ReactNode;
  className?: string;
};

function TrendPill({
  direction,
  value,
}: {
  direction: "up" | "down" | "flat";
  value: string;
}) {
  const base =
    "inline-flex items-center rounded-md border px-2 py-1 text-xs fk-hover";

  const dirLabel =
    direction === "up" ? "Up" : direction === "down" ? "Down" : "Flat";

  return (
    <span
      className={base}
      aria-label={`Trend ${dirLabel}: ${value}`}
      title={`Trend ${dirLabel}: ${value}`}
    >
      <span className="fk-mono">{value}</span>
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  trend,
  right,
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium fk-muted">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {value}
          </div>
          {hint ? <div className="mt-2 fk-body fk-muted">{hint}</div> : null}
        </div>

        <div className="flex items-center gap-2">
          {trend ? (
            <TrendPill direction={trend.direction} value={trend.value} />
          ) : null}
          {right ? <div>{right}</div> : null}
        </div>
      </div>
    </Card>
  );
}

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-8 w-32 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-3 h-4 w-56 rounded bg-black/10 dark:bg-white/10" />
        </div>

        <div className="h-7 w-16 rounded bg-black/10 dark:bg-white/10" />
      </div>
    </Card>
  );
}