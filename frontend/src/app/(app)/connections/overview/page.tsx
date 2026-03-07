import { Card } from "@/components/patterns/Card";

export default function ConnectionsOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="fk-h1">Connections Overview</h1>

      <Card>
        <p className="fk-body">
          Placeholder route. UI will live in{" "}
          <span className="fk-mono">src/modules/connections</span>.
        </p>

        <p className="fk-body fk-muted mt-2">
          Connection status, sync health, and platform integrations will be
          implemented inside the connections module.
        </p>
      </Card>
    </div>
  );
}