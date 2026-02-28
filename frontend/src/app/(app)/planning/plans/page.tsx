"use client";

import { Card } from "@/components/patterns/Card";
import { PageFrame } from "@/components/patterns/PageFrame";
import { CreatePlanButton } from "@/modules/planning/components/CreatePlanButton";

export default function PlansListPage() {
  return (
    <PageFrame
      title="Plans"
      subtitle="Plan generation, listing, and AI integration logic will live inside the planning module."
      right={<CreatePlanButton />}
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
