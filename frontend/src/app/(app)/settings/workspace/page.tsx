import { Card } from "@/components/patterns/Card";

export default function SettingsWorkspacePage() {
  return (
    <div className="space-y-6">
      <h1 className="fk-h1">Workspace Settings</h1>

      <Card>
        <p className="fk-body">
          Placeholder route. UI will live in{" "}
          <span className="fk-mono">src/modules/settings</span>.
        </p>

        <p className="fk-body fk-muted mt-2">
          Workspace profile, members, and preferences will be implemented inside
          the settings module.
        </p>
      </Card>
    </div>
  );
}