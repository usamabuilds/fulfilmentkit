export type QueryKey = readonly unknown[];

export type CreatedAtRange = {
  from?: string; // ISO or YYYY-MM-DD, passed through as-is
  to?: string;
};

export type Pagination = {
  page?: number;
  pageSize?: number;
};

export type ListParams = Pagination & CreatedAtRange & Record<string, unknown>;

function ws(workspaceId: string) {
  return workspaceId;
}

/**
 * Global query key conventions (LOCKED):
 * - Always array keys
 * - Always include workspaceId right after module name
 * - Use stable segments: "list", "detail"
 * - Params are included as a single object at the end of list keys
 */
export const queryKeys = {
  workspaces: {
    list: (params: ListParams = {}) => ["workspaces", "list", params] as const,
    detail: (workspaceId: string) => ["workspaces", "detail", ws(workspaceId)] as const,
  },

  dashboard: {
    summary: (workspaceId: string) =>
      ["dashboard", ws(workspaceId), "summary"] as const,

    trends: (workspaceId: string, params: ListParams = {}) =>
      ["dashboard", ws(workspaceId), "trends", "list", params] as const,

    breakdown: (workspaceId: string, params: ListParams = {}) =>
      ["dashboard", ws(workspaceId), "breakdown", "list", params] as const,
  },

  orders: {
    list: (workspaceId: string, params: ListParams = {}) =>
      ["orders", ws(workspaceId), "list", params] as const,

    detail: (workspaceId: string, orderId: string) =>
      ["orders", ws(workspaceId), "detail", orderId] as const,
  },

  inventory: {
    list: (workspaceId: string, params: ListParams = {}) =>
      ["inventory", ws(workspaceId), "list", params] as const,

    detail: (workspaceId: string, skuId: string) =>
      ["inventory", ws(workspaceId), "detail", skuId] as const,
  },

  finance: {
    overview: (workspaceId: string, params: ListParams = {}) =>
      ["finance", ws(workspaceId), "overview", "list", params] as const,
  },

  connections: {
    list: (workspaceId: string, params: ListParams = {}) =>
      ["connections", ws(workspaceId), "list", params] as const,

    detail: (workspaceId: string, connectionId: string) =>
      ["connections", ws(workspaceId), "detail", connectionId] as const,

    syncRuns: (workspaceId: string, connectionId: string, params: ListParams = {}) =>
      ["connections", ws(workspaceId), "syncRuns", "list", connectionId, params] as const,
  },

  plans: {
    list: (workspaceId: string, params: ListParams = {}) =>
      ["plans", ws(workspaceId), "list", params] as const,

    detail: (workspaceId: string, planId: string) =>
      ["plans", ws(workspaceId), "detail", planId] as const,
  },

  settings: {
    workspace: (workspaceId: string) => ["settings", ws(workspaceId), "workspace"] as const,
  },
} as const;