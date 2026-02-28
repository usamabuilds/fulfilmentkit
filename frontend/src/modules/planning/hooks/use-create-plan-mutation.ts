import { useMutation, useQueryClient } from "@tanstack/react-query";
import { actionSaved, actionSaveFailed } from "@/lib/toast/messages";
import { toastError, toastSuccess } from "@/lib/toast/toast";

type CreatePlanBody = {
  from: string;
  to: string;
  title?: string;
};

type CreatePlanResponse = {
  data?: {
    id?: string;
  };
};

type UseCreatePlanMutationOptions = {
  onCreated?: (planId: string) => void;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function defaultCreatePlanBody(): CreatePlanBody {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 29);

  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

export function useCreatePlanMutation(options?: UseCreatePlanMutationOptions) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreatePlanBody) => {
      const { createPlan } = await import("@/modules/planning/api");
      return createPlan(body);
    },
    onSuccess: (res: CreatePlanResponse) => {
      toastSuccess(actionSaved());

      void qc.invalidateQueries({ queryKey: ["plans"] });

      const planId = res?.data?.id;
      if (typeof planId === "string" && planId.length > 0) {
        options?.onCreated?.(planId);
      }
    },
    onError: () => {
      toastError(actionSaveFailed());
    },
  });
}
