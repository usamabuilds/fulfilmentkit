export type ApiErrorCode =
  | "WORKSPACE_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "NETWORK_ERROR"
  | "BACKEND_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  status?: number;
  details?: unknown;
};

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    typeof (err as { code?: unknown }).code === "string" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}

export function safeJsonParse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function extractMessage(data: unknown, fallback: string): string {
  try {
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
    ) {
      return (data as { message: string }).message;
    }

    // Backend error envelope support: { success: false, error: { message: string } }
    if (typeof data === "object" && data !== null && "error" in data) {
      const error = (data as { error?: unknown }).error;
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
      ) {
        return (error as { message: string }).message;
      }
    }
  } catch {
    // never throw from message extraction
  }

  return fallback;
}

export function workspaceRequiredError(): ApiError {
  return {
    code: "WORKSPACE_REQUIRED",
    message: "Workspace is required.",
    details: { code: "WORKSPACE_REQUIRED" },
  };
}

export function networkError(details?: unknown): ApiError {
  return {
    code: "NETWORK_ERROR",
    message: "Network error. Please try again.",
    details,
  };
}

export function httpError(input: {
  status: number;
  message?: string;
  details?: unknown;
}): ApiError {
  const { status } = input;

  if (status === 401) {
    return {
      code: "UNAUTHORIZED",
      status,
      message: input.message || "Unauthorized. Check your token.",
      details: input.details,
    };
  }

  if (status === 403) {
    return {
      code: "FORBIDDEN",
      status,
      message: input.message || "Forbidden. You do not have access.",
      details: input.details,
    };
  }

  if (status === 404) {
    return {
      code: "NOT_FOUND",
      status,
      message: input.message || "Not found.",
      details: input.details,
    };
  }

  if (status === 400) {
    return {
      code: "BAD_REQUEST",
      status,
      message: input.message || "Bad request.",
      details: input.details,
    };
  }

  return {
    code: "BACKEND_ERROR",
    status,
    message: input.message || "Request failed.",
    details: input.details,
  };
}