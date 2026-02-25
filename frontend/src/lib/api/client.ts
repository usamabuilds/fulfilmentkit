import {
  type ApiError,
  safeJsonParse,
  extractMessage,
  workspaceRequiredError,
  networkError,
  httpError,
} from "@/lib/api/errors";

type ApiClientOptions = {
  baseUrl?: string;
  getToken?: () => string | null;
  getWorkspaceId?: () => string | null;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
) {
  const url = new URL(path, baseUrl);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  return url.toString();
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private getWorkspaceId: () => string | null;

  constructor(opts?: ApiClientOptions) {
    this.baseUrl = (opts?.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
    this.getToken = opts?.getToken ?? (() => localStorage.getItem("fk_token"));
    this.getWorkspaceId =
      opts?.getWorkspaceId ?? (() => localStorage.getItem("fk_workspace_id"));

    if (!this.baseUrl) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is missing.");
    }
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    const workspaceId = this.getWorkspaceId();
    if (!workspaceId) {
      throw workspaceRequiredError();
    }

    const token = this.getToken();
    const url = buildUrl(this.baseUrl, opts.path, opts.query);

    const headers: Record<string, string> = {
      "X-Workspace-Id": workspaceId,
      ...opts.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const hasBody = opts.body !== undefined;
    if (hasBody) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers,
        body: hasBody ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal,
      });
    } catch (e) {
      throw networkError(e);
    }

    const rawText = await res.text();
    const data = safeJsonParse(rawText);

    if (!res.ok) {
      const message = extractMessage(data, `Request failed with status ${res.status}.`);
      throw httpError({ status: res.status, message, details: data });
    }

    return data as T;
  }

  get<T>(
    path: string,
    query?: RequestOptions["query"],
    opts?: Omit<RequestOptions, "path" | "query" | "method">,
  ) {
    return this.request<T>({ method: "GET", path, query, ...opts });
  }

  post<T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "path" | "body" | "method">,
  ) {
    return this.request<T>({ method: "POST", path, body, ...opts });
  }

  put<T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "path" | "body" | "method">,
  ) {
    return this.request<T>({ method: "PUT", path, body, ...opts });
  }

  patch<T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "path" | "body" | "method">,
  ) {
    return this.request<T>({ method: "PATCH", path, body, ...opts });
  }

  delete<T>(
    path: string,
    opts?: Omit<RequestOptions, "path" | "method">,
  ) {
    return this.request<T>({ method: "DELETE", path, ...opts });
  }
}

// Single global instance.
// All modules must import this instead of creating their own clients.
export const apiClient = new ApiClient();

// Re-export error type for convenience in modules/hooks if needed.
export type { ApiError };