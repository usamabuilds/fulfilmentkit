"use client";

import { PageFrame } from "@/components/patterns/PageFrame";
import { OrdersListScreen } from "@/modules/orders/components/OrdersListScreen";

export default function OrdersListPage() {
  return (
    <PageFrame
      title="Orders"
      subtitle="Thin route. Fetching + parsing live in src/modules/orders."
    >
      <OrdersListScreen />
    </PageFrame>
  );
}