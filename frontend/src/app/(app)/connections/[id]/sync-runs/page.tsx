import { Card } from "@/components/patterns/Card";

export default function ConnectionSyncRunsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <h1 className="fk-h1">Connection Sync Runs</h1>

      <Card>
        <p className="fk-body">
          Placeholder route for{" "}
          <span className="fk-mono">
            connections/{params.id}/sync-runs
          </span>.
        </p>

        <p className="fk-body fk-muted mt-2">
          Sync history, job status, and run diagnostics will live inside{" "}
          <span className="fk-mono">src/modules/connections</span>.
        </p>
      </Card>
    </div>
  );
}