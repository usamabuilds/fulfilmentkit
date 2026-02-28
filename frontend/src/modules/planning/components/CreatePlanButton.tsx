"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  defaultCreatePlanBody,
  useCreatePlanMutation,
} from "@/modules/planning/hooks/use-create-plan-mutation";

export function CreatePlanButton() {
  const router = useRouter();

  const createPlanMutation = useCreatePlanMutation({
    onCreated: (planId) => {
      router.push(`/planning/plans/${planId}`);
    },
  });

  const onCreate = React.useCallback(() => {
    createPlanMutation.mutate(defaultCreatePlanBody());
  }, [createPlanMutation]);

  return (
    <button
      type="button"
      className="px-3 py-2 rounded-md text-sm fk-hover border bg-black text-white"
      aria-label="Create plan"
      title="Create plan"
      onClick={onCreate}
      disabled={createPlanMutation.isPending}
    >
      {createPlanMutation.isPending ? "Creating..." : "Create plan"}
    </button>
  );
}
