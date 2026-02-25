import { Card } from "@/components/patterns/Card";

export default function InventoryOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="fk-h1">Inventory Overview</h1>

      <Card>
        <p className="fk-body">
          Placeholder route. UI will live in{" "}
          <span className="fk-mono">src/modules/inventory</span>.
        </p>

        <p className="fk-body fk-muted mt-2">
          Inventory data, alerts, and metrics will be implemented inside the
          inventory module.
        </p>
      </Card>
    </div>
  );
}