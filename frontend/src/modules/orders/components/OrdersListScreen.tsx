"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/patterns/Card";
import {
  FiltersBar,
  FilterGroup,
  SearchInput,
  DateRangeSelector,
  DropdownFilter,
  type DateRangeValue,
} from "@/components/patterns/FiltersBar";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { FkError } from "@/components/fk-error";
import { useOrdersList } from "../hooks/use-orders-list";
import type { OrderListItem } from "../types";
import { fkMotion } from "@/lib/styles/motion";
import { Skeleton } from "@/components/patterns/Skeleton";

const COLUMNS: Array<DataTableColumn<OrderListItem>> = [
  {
    key: "id",
    header: "Order",
    cell: (r) => <span className="fk-mono">{r.orderNumber ?? r.id}</span>,
  },
  { key: "channel", header: "Channel", cell: (r) => r.channel ?? "-" },
  { key: "status", header: "Status", cell: (r) => r.status },
  { key: "total", header: "Total", cell: (r) => r.total },
  { key: "orderedAt", header: "Ordered", cell: (r) => r.orderedAt },
];

function OrdersListSkeleton() {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" aria-label="Loading title" />
            <Skeleton className="h-3 w-32" aria-label="Loading subtitle" />
          </div>
          <Skeleton className="h-8 w-28" aria-label="Loading action" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-9 w-full" aria-label="Loading header row" />
          <Skeleton className="h-10 w-full" aria-label="Loading row 1" />
          <Skeleton className="h-10 w-full" aria-label="Loading row 2" />
          <Skeleton className="h-10 w-full" aria-label="Loading row 3" />
          <Skeleton className="h-10 w-full" aria-label="Loading row 4" />
          <Skeleton className="h-10 w-full" aria-label="Loading row 5" />
        </div>
      </div>
    </Card>
  );
}

export function OrdersListScreen() {
  const [q, setQ] = React.useState("");
  const [range, setRange] = React.useState<DateRangeValue>({});
  const [status, setStatus] = React.useState("");

  const query = React.useMemo(
    () => ({
      search: q || undefined,
      from: range.from || undefined,
      to: range.to || undefined,
      status: status || undefined,
      page: 1,
      pageSize: 20,
    }),
    [q, range, status]
  );

  const { data, isLoading, error } = useOrdersList(query);

  if (error) {
    return <FkError error={error} />;
  }

  return (
    <motion.div
      variants={fkMotion.variants.page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={fkMotion.transition.base}
      className="space-y-6"
    >
      <FiltersBar>
        <FilterGroup label="Search">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search by order number..."
          />
        </FilterGroup>

        <FilterGroup label="Date range">
          <DateRangeSelector value={range} onChange={setRange} />
        </FilterGroup>

        <FilterGroup label="Status">
          <DropdownFilter
            value={status}
            onChange={setStatus}
            placeholder="All statuses"
            options={[
              { value: "open", label: "Open" },
              { value: "fulfilled", label: "Fulfilled" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </FilterGroup>
      </FiltersBar>

      {isLoading ? (
        <motion.div
          variants={fkMotion.variants.module}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={fkMotion.transition.base}
        >
          <OrdersListSkeleton />
        </motion.div>
      ) : (
        <motion.div
          variants={fkMotion.variants.module}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={fkMotion.transition.base}
        >
          <DataTable<OrderListItem>
            title="Orders"
            subtitle="Orders list"
            columns={COLUMNS}
            rows={data?.items ?? []}
            rowKey={(r) => r.id}
            emptyTitle="No orders"
            emptyDescription="No orders match your filters."
          />
        </motion.div>
      )}
    </motion.div>
  );
}