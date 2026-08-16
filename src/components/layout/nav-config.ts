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
  WalletCards,
} from "lucide-react";
import type { Permission } from "../../rbac/index.js";

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
  requiredPermission?: Permission;
};

export const MERCHANT_NAV: AppNavItem[] = [
  { title: "داشبورد", href: "/dashboard", icon: LayoutDashboard, match: "exact", requiredPermission: "merchant.read" },
  { title: "صندوق", href: "/pos", icon: ShoppingBag, match: "prefix", requiredPermission: "pos.sale" },
  { title: "سفارش‌ها", href: "/orders", icon: ClipboardList, match: "prefix", requiredPermission: "store.read" },
  { title: "مشتریان", href: "/customers", icon: Users, match: "prefix", requiredPermission: "crm.read" },
  { title: "محصولات", href: "/products", icon: Package, match: "prefix", requiredPermission: "store.read" },
  { title: "موجودی", href: "/inventory", icon: Boxes, match: "prefix", requiredPermission: "inventory.read" },
  { title: "وفاداری", href: "/loyalty", icon: Gift, match: "prefix", requiredPermission: "loyalty.read" },
  { title: "مالی", href: "/finance", icon: WalletCards, match: "prefix", requiredPermission: "finance.view" },
  { title: "کارکنان و دسترسی‌ها", href: "/staff", icon: Users, match: "prefix", requiredPermission: "merchant.staff_manage" },
  { title: "اعلان‌ها", href: "/notifications", icon: Bell, match: "prefix", requiredPermission: "merchant.read" },
  { title: "فروشگاه‌ها", href: "/stores", icon: Store, match: "prefix", requiredPermission: "store.read" },
];

/** Compact bottom-nav subset for mobile thumb zone */
export const MERCHANT_BOTTOM_NAV: AppNavItem[] = [
  { title: "داشبورد", href: "/dashboard", icon: LayoutDashboard, match: "exact", requiredPermission: "merchant.read" },
  { title: "صندوق", href: "/pos", icon: ShoppingBag, match: "prefix", requiredPermission: "pos.sale" },
  { title: "سفارش‌ها", href: "/orders", icon: ClipboardList, match: "prefix", requiredPermission: "store.read" },
  { title: "مشتریان", href: "/customers", icon: Users, match: "prefix", requiredPermission: "crm.read" },
  { title: "بیشتر", href: "/stores", icon: Store, match: "prefix", requiredPermission: "store.read" },
];

export const ADMIN_NAV: AppNavItem[] = [
  { title: "نمای کلی", href: "/admin", icon: LayoutDashboard, match: "exact", requiredPermission: "admin.platform" },
  { title: "فروشندگان", href: "/admin/merchants", icon: Building2, match: "prefix", requiredPermission: "admin.platform" },
  { title: "امنیت", href: "/admin/security", icon: Shield, match: "prefix", requiredPermission: "admin.platform" },
  { title: "ممیزی", href: "/admin/audit", icon: ScrollText, match: "prefix", requiredPermission: "admin.platform" },
  { title: "تنظیمات", href: "/admin", icon: Settings, match: "exact", requiredPermission: "admin.platform" },
];

export function isNavActive(pathname: string, item: AppNavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

