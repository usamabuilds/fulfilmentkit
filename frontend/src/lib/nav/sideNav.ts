import type { IconKey, ModuleKey } from "./modules";

export type SideNavItem = {
  key: string;
  label: string;
  href: string;
  icon: IconKey;
};

export const SIDE_NAV: Record<ModuleKey, SideNavItem[]> = {
  dashboard: [
    { key: "overview", label: "Overview", href: "/dashboard/overview", icon: "dashboard" },
  ],

  orders: [
    { key: "list", label: "Orders", href: "/orders/list", icon: "orders" },
  ],

  inventory: [
    { key: "overview", label: "Overview", href: "/inventory/overview", icon: "inventory" },
  ],

  finance: [
    { key: "overview", label: "Overview", href: "/finance/overview", icon: "finance" },
  ],

  planning: [
    { key: "plans", label: "Plans", href: "/planning/plans", icon: "planning" },
  ],

  connections: [
    { key: "overview", label: "Overview", href: "/connections/overview", icon: "connections" },
  ],

  settings: [
    { key: "workspace", label: "Workspace", href: "/settings/workspace", icon: "settings" },
  ],
};

export function getSideNavItems(moduleKey: ModuleKey | null): SideNavItem[] {
  if (!moduleKey) return [];
  return SIDE_NAV[moduleKey] ?? [];
}