import * as React from "react";

export type PageFrameProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PageFrame({
  title,
  subtitle,
  right,
  children,
  className,
}: PageFrameProps) {
  return (
    <section className={["space-y-6", className ?? ""].join(" ")}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="fk-h1">{title}</h1>
          {subtitle ? <p className="fk-body fk-muted mt-2">{subtitle}</p> : null}
        </div>

        {right ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {right}
          </div>
        ) : null}
      </header>

      <div>{children}</div>
    </section>
  );
}