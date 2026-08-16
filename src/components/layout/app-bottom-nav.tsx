"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { usePermissions } from "@/hooks/use-permissions";
import { isNavActive, type AppNavItem } from "./nav-config";

export type AppBottomNavProps = {
  items: AppNavItem[];
  className?: string;
};

export function AppBottomNav({ items, className }: AppBottomNavProps) {
  const pathname = usePathname() ?? "/";
  const { hasPermission } = usePermissions();

  const visibleItems = items.filter((item) => {
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  return (
    <nav
      aria-label="ناوبری پایین"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-1 py-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item);
          return (
            <li key={item.href + item.title} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] transition-colors",
                  active
                    ? "bg-primary text-on-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-surface-container-high hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden />
                <span className="truncate">{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
