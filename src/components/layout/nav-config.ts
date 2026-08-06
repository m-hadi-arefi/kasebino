import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Boxes,
  ClipboardList,
  Gift,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Users,
  Shield,
  ScrollText,
  Building2,
} from "lucide-react";

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
};

export const MERCHANT_NAV: AppNavItem[] = [
  { title: "داشبورد", href: "/dashboard", icon: LayoutDashboard, match: "exact" },
  { title: "صندوق", href: "/pos", icon: ShoppingBag, match: "prefix" },
  { title: "سفارش‌ها", href: "/orders", icon: ClipboardList, match: "prefix" },
  { title: "مشتریان", href: "/customers", icon: Users, match: "prefix" },
  { title: "محصولات", href: "/products", icon: Package, match: "prefix" },
  { title: "موجودی", href: "/inventory", icon: Boxes, match: "prefix" },
  { title: "وفاداری", href: "/loyalty", icon: Gift, match: "prefix" },
  { title: "اعلان‌ها", href: "/notifications", icon: Bell, match: "prefix" },
  { title: "فروشگاه‌ها", href: "/stores", icon: Store, match: "prefix" },
];

/** Compact bottom-nav subset for mobile thumb zone */
export const MERCHANT_BOTTOM_NAV: AppNavItem[] = [
  { title: "داشبورد", href: "/dashboard", icon: LayoutDashboard, match: "exact" },
  { title: "صندوق", href: "/pos", icon: ShoppingBag, match: "prefix" },
  { title: "سفارش‌ها", href: "/orders", icon: ClipboardList, match: "prefix" },
  { title: "مشتریان", href: "/customers", icon: Users, match: "prefix" },
  { title: "بیشتر", href: "/stores", icon: Store, match: "prefix" },
];

export const ADMIN_NAV: AppNavItem[] = [
  { title: "نمای کلی", href: "/admin", icon: LayoutDashboard, match: "exact" },
  { title: "فروشندگان", href: "/admin/merchants", icon: Building2, match: "prefix" },
  { title: "امنیت", href: "/admin/security", icon: Shield, match: "prefix" },
  { title: "ممیزی", href: "/admin/audit", icon: ScrollText, match: "prefix" },
  { title: "تنظیمات", href: "/admin", icon: Settings, match: "exact" },
];

export function isNavActive(pathname: string, item: AppNavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
