export type ModuleKey =
  | "dashboard"
  | "orders"
  | "inventory"
  | "finance"
  | "planning"
  | "connections"
  | "settings";

export type IconKey =
  | "dashboard"
  | "orders"
  | "inventory"
  | "finance"
  | "planning"
  | "connections"
  | "settings";

export type TopModule = {
  key: ModuleKey;
  label: string;
  href: string;
  icon: IconKey;
};

export const TOP_MODULES: TopModule[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { key: "orders", label: "Orders", href: "/orders", icon: "orders" },
  { key: "inventory", label: "Inventory", href: "/inventory", icon: "inventory" },
  { key: "finance", label: "Finance", href: "/finance", icon: "finance" },
  { key: "planning", label: "Planning", href: "/planning", icon: "planning" },
  { key: "connections", label: "Connections", href: "/connections", icon: "connections" },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings" },
];

/**
 * URL based active module detection:
 * - active module is the first path segment after "/"
 * - unknown segment returns null
 *
 * Examples:
 * - "/" => null (root redirects anyway)
 * - "/orders" => "orders"
 * - "/orders/123" => "orders"
 * - "/planning/plans/abc" => "planning"
 */
export function getActiveModuleKey(pathname: string): ModuleKey | null {
  if (!pathname) return null;

  const clean = pathname.split("?")[0]?.split("#")[0] ?? "";
  const seg = clean.split("/").filter(Boolean)[0] ?? "";

  switch (seg) {
    case "dashboard":
    case "orders":
    case "inventory":
    case "finance":
    case "planning":
    case "connections":
    case "settings":
      return seg;
    default:
      return null;
  }
}