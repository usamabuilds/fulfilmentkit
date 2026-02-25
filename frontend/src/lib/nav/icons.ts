import type { IconKey } from "./modules";

/**
 * Single source of truth for icon keys.
 * Later we will map these keys to lucide-react icons inside a single Icon component.
 */
export const ICON_LABELS: Record<IconKey, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  inventory: "Inventory",
  finance: "Finance",
  planning: "Planning",
  connections: "Connections",
  settings: "Settings",
};