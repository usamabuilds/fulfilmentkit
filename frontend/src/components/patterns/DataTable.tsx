import * as React from "react";
import { Card } from "@/components/patterns/Card";

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  title?: string;
  subtitle?: string;
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;

  isLoading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;

  className?: string;
};

export function DataTable<T>({
  title,
  subtitle,
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  error,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting filters or your search.",
  className,
}: DataTableProps<T>) {
  const clickable = Boolean(onRowClick);

  return (
    <Card className={["p-0 overflow-hidden", className ?? ""].join(" ")}>
      {title || subtitle ? (
        <div className="p-4 border-b">
          {title ? <div className="text-sm font-semibold">{title}</div> : null}
          {subtitle ? <div className="mt-1 fk-body fk-muted">{subtitle}</div> : null}
        </div>
      ) : null}

      {isLoading ? (
        <DataTableSkeleton columnsCount={columns.length} />
      ) : error ? (
        <DataTableErrorState message={error} />
      ) : rows.length === 0 ? (
        <DataTableEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={[
                      "px-4 py-3 text-xs font-medium fk-muted whitespace-nowrap",
                      c.className ?? "",
                    ].join(" ")}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => {
                const key = rowKey(row, idx);

                return (
                  <tr
                    key={key}
                    className={[
                      "border-b last:border-b-0",
                      clickable ? "cursor-pointer fk-hover" : "",
                    ].join(" ")}
                    onClick={clickable ? () => onRowClick?.(row) : undefined}
                    aria-label={clickable ? "Row" : undefined}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={[
                          "px-4 py-3 text-sm whitespace-nowrap",
                          c.className ?? "",
                        ].join(" ")}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function DataTableSkeleton({
  columnsCount = 4,
  rowsCount = 6,
}: {
  columnsCount?: number;
  rowsCount?: number;
}) {
  return (
    <div className="p-4">
      <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 border rounded-lg overflow-hidden">
        <div className="border-b px-4 py-3 flex gap-4">
          {Array.from({ length: columnsCount }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-24 rounded bg-black/10 dark:bg-white/10"
            />
          ))}
        </div>

        {Array.from({ length: rowsCount }).map((_, r) => (
          <div key={r} className="border-b last:border-b-0 px-4 py-3 flex gap-4">
            {Array.from({ length: columnsCount }).map((_, c) => (
              <div
                key={c}
                className="h-4 w-28 rounded bg-black/10 dark:bg-white/10"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTableEmptyState({
  title = "No results",
  description = "Try adjusting filters or your search.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="p-6">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 fk-body fk-muted">{description}</div>
    </div>
  );
}

export function DataTableErrorState({
  message = "Something went wrong.",
}: {
  message?: string;
}) {
  return (
    <div className="p-6">
      <div className="text-sm font-semibold">Error</div>
      <div className="mt-2 fk-body fk-muted">{message}</div>
    </div>
  );
}