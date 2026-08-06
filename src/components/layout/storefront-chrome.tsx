"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Gift,
  Home,
  Receipt,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type StorefrontChromeProps = {
  storeSlug: string;
  storeName: string;
  primaryColor?: string | null;
  children: React.ReactNode;
  mode?: "public" | "portal";
};

const portalLinks = (slug: string) =>
  [
    { title: "خانه", href: `/s/${slug}/dashboard`, icon: Home },
    { title: "سفارش‌ها", href: `/s/${slug}/dashboard/orders`, icon: ShoppingBag },
    { title: "کیف پول", href: `/s/${slug}/dashboard/wallet`, icon: Wallet },
    { title: "پاداش", href: `/s/${slug}/dashboard/rewards`, icon: Gift },
    { title: "اعلان‌ها", href: `/s/${slug}/dashboard/notifications`, icon: Bell },
  ] as const;

export function StorefrontChrome({
  storeSlug,
  storeName,
  primaryColor,
  children,
  mode = "public",
}: StorefrontChromeProps) {
  const pathname = usePathname() ?? "";
  const style = primaryColor
    ? ({ ["--color-primary" as string]: primaryColor } as React.CSSProperties)
    : undefined;
  const links = portalLinks(storeSlug);
  const showPortalNav = mode === "portal";

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background"
      style={style}
      dir="rtl"
      lang="fa"
    >
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/s/${storeSlug}`}
            className="truncate text-base font-semibold text-foreground"
          >
            {storeName}
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href={`/s/${storeSlug}/catalog`}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              کاتالوگ
            </Link>
            <Link
              href={`/s/${storeSlug}/dashboard/receipts`}
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label="رسیدها"
            >
              <Receipt className="size-4" />
            </Link>
          </nav>
        </div>
      </header>
      <main className={cn("flex-1 px-4 py-5", showPortalNav && "pb-24")}>
        {children}
      </main>
      {showPortalNav ? (
        <nav
          aria-label="منوی مشتری"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <ul className="mx-auto flex max-w-lg justify-between px-1 py-1">
            {links.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] transition-colors",
                      active
                        ? "bg-accent font-medium text-primary"
                        : "text-muted-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-5" aria-hidden />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
