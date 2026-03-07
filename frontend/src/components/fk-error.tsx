import * as React from "react";
import type { ApiError } from "@/lib/api/client";
import { Card } from "@/components/patterns/Card";

type FriendlyError = {
  title: string;
  message: string;
  hint?: string;
  code?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function normalizeError(err: unknown): FriendlyError {
  // Prefer our ApiError shape when possible
  const maybeApi = err as Partial<ApiError> | null;

  if (maybeApi && typeof maybeApi === "object") {
    const code = (maybeApi as { code?: unknown }).code;
    const codeStr = getString(code);

    // WORKSPACE_REQUIRED
    if (codeStr === "WORKSPACE_REQUIRED") {
      return {
        title: "Workspace required",
        message: "Select a workspace to continue.",
        hint: "Set fk_workspace_id in localStorage or use the workspace switcher when we add it.",
        code: "WORKSPACE_REQUIRED",
      };
    }

    // NETWORK_ERROR
    if (codeStr === "NETWORK_ERROR") {
      return {
        title: "Network error",
        message: "We could not reach the server.",
        hint: "Check NEXT_PUBLIC_API_BASE_URL and make sure backend is running.",
        code: "NETWORK_ERROR",
      };
    }

    // HTTP_ERROR (we expect: { code: 'HTTP_ERROR', status?: number, message?: string })
    if (codeStr === "HTTP_ERROR") {
      const status = getNumber((maybeApi as { status?: unknown }).status);
      const msg =
        getString((maybeApi as { message?: unknown }).message) ?? "Request failed.";

      return {
        title: status ? `Request failed (${status})` : "Request failed",
        message: msg,
        hint: "If this keeps happening, copy the details for debugging.",
        code: "HTTP_ERROR",
      };
    }

    // VALIDATION_ERROR (from our parseOrThrow -> ApiError.details)
    const details = (maybeApi as { details?: unknown }).details;
    if (isRecord(details)) {
      const detailsCode = getString(details.code);
      if (detailsCode === "VALIDATION_ERROR") {
        return {
          title: "Data validation failed",
          message: "We received unexpected data from the server. Please retry.",
          hint: "Backend response did not match the expected schema.",
          code: "VALIDATION_ERROR",
        };
      }
    }
  }

  // Generic Error
  if (err instanceof Error) {
    return {
      title: "Something went wrong",
      message: err.message,
    };
  }

  return {
    title: "Something went wrong",
    message: "Unknown error.",
  };
}

function CodeBadge(props: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
      {props.code}
    </span>
  );
}

export function FkError(props: { error: unknown; className?: string }) {
  const friendly = React.useMemo(() => normalizeError(props.error), [props.error]);

  return (
    <Card className={props.className}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{friendly.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{friendly.message}</div>
            {friendly.hint ? (
              <div className="mt-2 text-xs text-muted-foreground">{friendly.hint}</div>
            ) : null}
          </div>

          {friendly.code ? <CodeBadge code={friendly.code} /> : null}
        </div>
      </div>
    </Card>
  );
}