import { Card } from "@/components/patterns/Card";
import { PageFrame } from "@/components/patterns/PageFrame";

export default function PlansListPage() {
  return (
    <PageFrame
      title="Plans"
      subtitle="Plan generation, listing, and AI integration logic will live inside the planning module."
      right={
        <button
          type="button"
          className="px-3 py-2 rounded-md text-sm fk-hover border bg-black text-white"
          aria-label="Create plan"
          title="Create plan"
        >
          Create plan
        </button>
      }
    >
      <Card>
        <p className="fk-body">
          Placeholder route. UI will live in{" "}
          <span className="fk-mono">src/modules/planning</span>.
        </p>
      </Card>
    </PageFrame>
  );
}