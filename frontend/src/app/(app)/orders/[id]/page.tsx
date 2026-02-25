import { Card } from "@/components/patterns/Card";

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <h1 className="fk-h1">Order Detail</h1>

      <Card>
        <p className="fk-body">
          Placeholder route for{" "}
          <span className="fk-mono">orders/{params.id}</span>.
        </p>

        <p className="fk-body fk-muted mt-2">
          All fetching, validation, and business logic will live inside{" "}
          <span className="fk-mono">src/modules/orders</span>.
        </p>
      </Card>
    </div>
  );
}