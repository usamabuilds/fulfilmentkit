"use client";

import * as React from "react";

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({
  className,
  "aria-label": ariaLabel = "Loading",
}: {
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      role="status"
      className={cn("rounded-md bg-muted", className)}
    />
  );
}