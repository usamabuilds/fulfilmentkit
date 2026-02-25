import type { ZodType } from "zod";
import { type ApiError } from "@/lib/api/errors";

export type ValidationContext = {
  module: string;
  operation: string;
};

export type ValidationErrorDetails = {
  context: ValidationContext;
  issues: Array<{
    path: string;
    message: string;
  }>;
  receivedType: string;
};

export function toValidationError(input: ValidationErrorDetails): ApiError {
  return {
    code: "BACKEND_ERROR",
    message: "We received unexpected data from the server. Please retry.",
    details: {
      code: "VALIDATION_ERROR",
      ...input,
    },
  };
}

function receivedTypeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function issuePath(path: Array<string | number>): string {
  if (path.length === 0) return "(root)";
  return path.map((p) => String(p)).join(".");
}

/**
 * Strict parsing for critical screens.
 * - returns typed output on success
 * - throws ApiError with VALIDATION_ERROR details on failure
 */
export function parseOrThrow<T>(
  schema: ZodType<T>,
  data: unknown,
  context: ValidationContext,
): T {
  const res = schema.safeParse(data);

  if (res.success) return res.data;

  const issues = res.error.issues.map((i) => ({
    path: issuePath(i.path),
    message: i.message,
  }));

  throw toValidationError({
    context,
    issues,
    receivedType: receivedTypeOf(data),
  });
}