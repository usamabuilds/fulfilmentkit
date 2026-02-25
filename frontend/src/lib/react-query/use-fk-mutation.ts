"use client";

import * as React from "react";
import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { fkToast } from "@/components/fk-toaster";

type Invalidate = QueryKey | QueryKey[];

type FkMutationToast = {
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
};

type FkMutationOptions<TData, TVariables, TError, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "onSuccess" | "onError" | "onSettled"
> & {
  invalidate?: Invalidate;
  toast?: FkMutationToast;
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void;
};

function normalizeInvalidateKeys(invalidate?: Invalidate): QueryKey[] {
  if (!invalidate) return [];
  return Array.isArray(invalidate[0])
    ? (invalidate as QueryKey[])
    : [invalidate as QueryKey];
}

export function useFkMutation<
  TData,
  TVariables,
  TError = unknown,
  TContext = unknown
>(
  options: FkMutationOptions<TData, TVariables, TError, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const qc = useQueryClient();

  const invalidateKeys = React.useMemo(
    () => normalizeInvalidateKeys(options.invalidate),
    [options.invalidate]
  );

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onSuccess: (data, variables, context) => {
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }

      if (options.toast?.successTitle) {
        fkToast({
          variant: "success",
          title: options.toast.successTitle,
          description: options.toast.successDescription,
        });
      }

      options.onSuccess?.(data, variables, context);
      options.onSettled?.(data, null, variables, context);
    },
    onError: (error, variables, context) => {
      if (options.toast?.errorTitle) {
        fkToast({
          variant: "error",
          title: options.toast.errorTitle,
          description: options.toast.errorDescription,
        });
      }

      options.onError?.(error, variables, context);
      options.onSettled?.(undefined, error, variables, context);
    },
  });
}