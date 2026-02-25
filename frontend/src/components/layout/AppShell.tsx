"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TOP_MODULES,
  getActiveModuleKey,
  type ModuleKey,
} from "@/lib/nav/modules";
import { getSideNavItems, type SideNavItem } from "@/lib/nav/sideNav";
import { Icon } from "@/components/ui/Icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { fkMotion } from "@/lib/styles/motion";

type AppShellProps = {
  brand?: string;
  children: React.ReactNode;
};

export function AppShell({ brand = "FulfilmentKit", children }: AppShellProps) {
  const pathname = usePathname();
  const activeModule = getActiveModuleKey(pathname);
  const sideItems = getSideNavItems(activeModule);

  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      {/* Floating chips (desktop) */}
      <div className="hidden md:block">
        {/* Brand chip */}
        <div className="fixed left-4 top-4 z-40">
          <div className="fk-glass-topbar rounded-full px-3 py-2 shadow-sm">
            <div className="font-semibold text-sm leading-none">{brand}</div>
          </div>
        </div>

        {/* Module pill (global nav) */}
        <TopModuleBar
          brand={brand}
          activeModule={activeModule}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          variant="floating"
        />

        {/* Side rail (pages inside module) */}
        <div className="fixed left-4 top-24 z-40">
          <SideNav
            pathname={pathname}
            activeModule={activeModule}
            items={sideItems}
            variant="icons"
            floating
          />
        </div>
      </div>

      {/* Mobile: top bar + slide-out nav */}
      <div className="md:hidden">
        <TopModuleBar
          brand={brand}
          activeModule={activeModule}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          variant="mobile"
        />

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
            />

            <div className="absolute left-0 top-0 h-full w-72 fk-glass-sidebar p-3">
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="text-sm font-semibold">Navigation</div>
                <button
                  type="button"
                  className="text-sm fk-muted fk-hover px-2 py-1 rounded-md"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close"
                >
                  Close
                </button>
              </div>

              <SideNav
                pathname={pathname}
                activeModule={activeModule}
                items={sideItems}
                variant="full"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Content padding accounts for floating pills */}
      <MainContentFrame motionKey={pathname}>{children}</MainContentFrame>
    </div>
  );
}

type TopBarVariant = "floating" | "mobile";

type TopModuleBarProps = {
  brand: string;
  activeModule: ModuleKey | null;
  onOpenMobileNav: () => void;
  variant?: TopBarVariant;
};

export function TopModuleBar({
  brand,
  activeModule,
  onOpenMobileNav,
  variant = "mobile",
}: TopModuleBarProps) {
  const motionKey = activeModule ?? "none";
  const isFloating = variant === "floating";

  if (isFloating) {
    return (
      <div className="fixed left-1/2 top-4 z-40 -translate-x-1/2">
        <motion.nav
          key={motionKey}
          className="fk-glass-topbar rounded-full px-2 py-1.5 shadow-sm flex items-center gap-1 overflow-x-auto"
          variants={fkMotion.variants.module}
          initial="initial"
          animate="animate"
          transition={fkMotion.transition.base}
          aria-label="Modules"
        >
          {TOP_MODULES.map((m) => {
            const isActive = activeModule === m.key;
            return (
              <Link
                key={m.key}
                href={m.href}
                className={[
                  "px-3 py-2 rounded-full text-sm whitespace-nowrap flex items-center gap-2 fk-hover",
                  isActive ? "bg-black text-white" : "",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
                aria-label={m.label}
                title={m.label}
              >
                <Icon name={m.icon} className={isActive ? "text-white" : ""} />
                <span className="hidden lg:inline">{m.label}</span>
              </Link>
            );
          })}
        </motion.nav>
      </div>
    );
  }

  return (
    <header className="h-14 flex items-center px-4 gap-3 fk-glass-topbar">
      <div className="font-semibold text-sm">{brand}</div>

      <button
        type="button"
        className="text-sm fk-hover px-2 py-1 rounded-md border"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
      >
        Menu
      </button>

      <motion.nav
        key={motionKey}
        className="flex items-center gap-1 overflow-x-auto"
        variants={fkMotion.variants.module}
        initial="initial"
        animate="animate"
        transition={fkMotion.transition.base}
        aria-label="Modules"
      >
        {TOP_MODULES.map((m) => {
          const isActive = activeModule === m.key;
          return (
            <Link
              key={m.key}
              href={m.href}
              className={[
                "px-3 py-1.5 rounded-md text-sm whitespace-nowrap flex items-center gap-2 fk-hover",
                isActive ? "bg-black text-white" : "",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
              aria-label={m.label}
              title={m.label}
            >
              <Icon name={m.icon} className={isActive ? "text-white" : ""} />
              <span>{m.label}</span>
            </Link>
          );
        })}
      </motion.nav>
    </header>
  );
}

type SideNavVariant = "icons" | "full";

type SideNavProps = {
  pathname: string;
  activeModule: ModuleKey | null;
  items: SideNavItem[];
  variant?: SideNavVariant;
  className?: string;
  floating?: boolean;
};

export function SideNav({
  pathname,
  activeModule,
  items,
  variant = "full",
  className,
  floating = false,
}: SideNavProps) {
  const isIcons = variant === "icons";

  return (
    <aside
      className={[
        isIcons ? "w-16" : "w-56",
        floating
          ? "fk-glass-sidebar rounded-2xl shadow-sm p-2"
          : "border-r p-3 fk-glass-sidebar",
        className ?? "",
      ].join(" ")}
    >
      {/* Do not render module label in icons rail (prevents clipping) */}
      {!isIcons ? (
        <div className="text-xs font-medium fk-muted px-2 py-2">
          {activeModule ? activeModule.toUpperCase() : "MODULE"}
        </div>
      ) : null}

      <nav className="flex flex-col gap-1">
        {items.length === 0 ? (
          <div
            className={[
              "text-sm fk-muted px-2 py-2",
              isIcons ? "text-center" : "",
            ].join(" ")}
          >
            No pages
          </div>
        ) : (
          items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            const linkClassName = [
              "rounded-md fk-hover",
              isIcons
                ? "h-10 w-10 mx-auto flex items-center justify-center"
                : "px-2 py-2 text-sm flex items-center gap-2",
              isActive ? "bg-black text-white" : "",
            ].join(" ");

            const iconNode = (
              <Icon name={item.icon} className={isActive ? "text-white" : ""} />
            );

            if (isIcons) {
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={linkClassName}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {iconNode}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                className={linkClassName}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {iconNode}
                <span>{item.label}</span>
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}

type MainContentFrameProps = {
  children: React.ReactNode;
  motionKey: string;
};

export function MainContentFrame({ children, motionKey }: MainContentFrameProps) {
  return (
    <main className="min-h-screen px-4 pb-6 pt-20 md:pt-24 md:pl-24">
      <div className="fk-page fk-glass-card rounded-3xl min-h-[calc(100vh-7rem)]">
        <motion.div
          key={motionKey}
          variants={fkMotion.variants.page}
          initial="initial"
          animate="animate"
          transition={fkMotion.transition.base}
        >
          {children}
        </motion.div>
      </div>
    </main>
  );
}