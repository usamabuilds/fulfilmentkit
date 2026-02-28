export const endpoints = {
  workspaces: {
    list: "/workspaces",
    detail: (workspaceId: string) => `/workspaces/${workspaceId}`,
  },

  connections: {
    list: "/connections",
    detail: (connectionId: string) => `/connections/${connectionId}`,
  },

  orders: {
    list: "/orders",
    detail: (orderId: string) => `/orders/${orderId}`,
  },

  inventory: {
    list: "/inventory",
    detail: (skuId: string) => `/inventory/${skuId}`,
  },

  locations: {
    list: "/locations",
    detail: (locationId: string) => `/locations/${locationId}`,
  },

  dashboard: {
    summary: "/dashboard/summary",
    trends: "/dashboard/trends",
    breakdown: "/dashboard/breakdown",
    alerts: "/dashboard/alerts",
  },

  ai: {
    root: "/ai",
  },

  plans: {
    list: "/plans",
    detail: (planId: string) => `/plans/${planId}`,
  },

  forecast: {
    root: "/forecast",
  },
} as const;
