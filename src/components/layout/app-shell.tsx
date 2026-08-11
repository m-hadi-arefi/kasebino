"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { AppBottomNav } from "./app-bottom-nav";
import { AppSidebarNav } from "./app-sidebar-nav";
import { AppTopbar } from "./app-topbar";
import {
  ADMIN_NAV,
  MERCHANT_BOTTOM_NAV,
  MERCHANT_NAV,
  type AppNavItem,
} from "./nav-config";

const BARE_MERCHANT_PREFIXES = ["/login", "/onboarding", "/pos"];

function isBareMerchantPath(pathname: string): boolean {
  return BARE_MERCHANT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export type AppShellProps = {
  children: ReactNode;
  variant: "merchant" | "admin";
  topbarTrailing?: ReactNode;
  sidebarFooter?: ReactNode;
};

export function AppShell({
  children,
  variant,
  topbarTrailing,
  sidebarFooter,
}: AppShellProps) {
  const pathname = usePathname() ?? "/";

  if (variant === "merchant" && isBareMerchantPath(pathname)) {
    return <>{children}</>;
  }

  const navItems: AppNavItem[] =
    variant === "merchant" ? MERCHANT_NAV : ADMIN_NAV;
  const bottomItems: AppNavItem[] =
    variant === "merchant" ? MERCHANT_BOTTOM_NAV : ADMIN_NAV.slice(0, 4);
  const brandHref = variant === "merchant" ? "/dashboard" : "/admin";
  const brand = variant === "merchant" ? "کاسبینو" : "ادمین کاسبینو";

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-dvh w-full">
          <AppSidebarNav
            items={navItems}
            brand={brand}
            brandHref={brandHref}
            footer={sidebarFooter}
          />
          <SidebarInset className="min-w-0">
            <AppTopbar
              title={variant === "merchant" ? "فضای فروشنده" : "پنل مدیریت"}
              trailing={topbarTrailing}
            />
            <div
              className={cn(
                "mx-auto w-full flex-1 px-4 py-6 sm:px-6",
                "pb-24 md:pb-8",
                "max-w-6xl",
              )}
            >
              {children}
            </div>
            <AppBottomNav items={bottomItems} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export type PosChromeProps = {
  children: ReactNode;
  trailing?: ReactNode;
};

/** Dense full-bleed chrome for POS — no sidebar clutter on phone. */
export function PosChrome({ children, trailing }: PosChromeProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 backdrop-blur">
        <a
          href="/dashboard"
          className="text-sm font-medium text-primary hover:underline"
        >
          بازگشت به داشبورد
        </a>
        {trailing}
      </header>
      <div className="flex-1 px-3 py-4 sm:px-4">{children}</div>
    </div>
  );
}
