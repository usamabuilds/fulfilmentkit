"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  DollarSign,
  Brain,
  Plug,
  Settings,
} from "lucide-react";

export type AppIconKey =
  | "dashboard"
  | "orders"
  | "inventory"
  | "finance"
  | "planning"
  | "connections"
  | "settings";

const ICON_MAP: Record<AppIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingCart,
  inventory: Boxes,
  finance: DollarSign,
  planning: Brain,
  connections: Plug,
  settings: Settings,
};

type IconProps = {
  name: AppIconKey;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function Icon({
  name,
  className,
  size = 18,            // Apple-clean default
  strokeWidth = 1.75,   // Balanced thin stroke
}: IconProps) {
  const Comp = ICON_MAP[name];

  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      className={`
        text-muted-foreground
        transition-colors
        duration-150
        ${className ?? ""}
      `}
      aria-hidden
    />
  );
}