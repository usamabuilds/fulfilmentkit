import { Card } from "@/components/patterns/Card";

export default function FinanceOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="fk-h1">Finance Overview</h1>

      <Card>
        <p className="fk-body">
          Placeholder route. UI will live in{" "}
          <span className="fk-mono">src/modules/finance</span>.
        </p>

        <p className="fk-body fk-muted mt-2">
          Margin, fees, refunds, and financial metrics will be implemented
          inside the finance module.
        </p>
      </Card>
    </div>
  );
}