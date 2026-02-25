import * as React from "react";
import { Card } from "@/components/patterns/Card";

export type AlertTone = "info" | "warning" | "danger";

export type AlertCardProps = {
  title: string;
  description?: string;
  tone?: AlertTone;
  right?: React.ReactNode;
  meta?: string;
  className?: string;
};

function toneLabel(tone: AlertTone) {
  switch (tone) {
    case "warning":
      return "Warning";
    case "danger":
      return "Critical";
    default:
      return "Info";
  }
}

function ToneDot({ tone }: { tone: AlertTone }) {
  const cls =
    tone === "danger"
      ? "bg-red-500/70"
      : tone === "warning"
        ? "bg-amber-500/70"
        : "bg-sky-500/70";

  return <span className={["h-2.5 w-2.5 rounded-full", cls].join(" ")} />;
}

export function AlertCard({
  title,
  description,
  tone = "info",
  right,
  meta,
  className,
}: AlertCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ToneDot tone={tone} />
            <div className="text-xs font-medium fk-muted">
              {toneLabel(tone)}
              {meta ? <span className="fk-muted"> · {meta}</span> : null}
            </div>
          </div>

          <div className="mt-2 text-sm font-semibold">{title}</div>

          {description ? (
            <div className="mt-2 fk-body fk-muted">{description}</div>
          ) : null}
        </div>

        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    </Card>
  );
}

export function AlertsEmptyState({
  title = "No alerts",
  description = "You're all clear right now.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 fk-body fk-muted">{description}</div>
    </Card>
  );
}