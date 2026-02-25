import * as React from "react";
import { Card } from "@/components/patterns/Card";

export type DateRangeValue = {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
};

export function FiltersBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={["p-3", className ?? ""].join(" ")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
          {children}
        </div>
      </div>
    </Card>
  );
}

export function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["min-w-[220px]", className ?? ""].join(" ")}>
      <div className="text-xs font-medium fk-muted">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  inputClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <div className={className}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          "w-full rounded-md border px-3 py-2 text-sm outline-none fk-hover",
          "bg-transparent",
          inputClassName ?? "",
        ].join(" ")}
        aria-label="Search"
      />
    </div>
  );
}

export function DateRangeSelector({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
}) {
  const from = value.from ?? "";
  const to = value.to ?? "";

  return (
    <div className={["flex flex-col gap-2 sm:flex-row sm:items-center", className ?? ""].join(" ")}>
      <input
        type="date"
        value={from}
        onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
        className="rounded-md border px-3 py-2 text-sm outline-none fk-hover bg-transparent"
        aria-label="From date"
      />
      <div className="text-xs fk-muted px-1">to</div>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
        className="rounded-md border px-3 py-2 text-sm outline-none fk-hover bg-transparent"
        aria-label="To date"
      />
    </div>
  );
}

export function DropdownFilter({
  value,
  onChange,
  options,
  placeholder = "All",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none fk-hover bg-transparent"
        aria-label="Filter"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}