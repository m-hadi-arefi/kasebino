"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

import { usePermissions } from "@/hooks/use-permissions";
import { isNavActive, type AppNavItem } from "./nav-config";

export type AppSidebarNavProps = {
  items: AppNavItem[];
  brand?: string;
  brandHref?: string;
  footer?: React.ReactNode;
  label?: string;
};

export function AppSidebarNav({
  items,
  brand = "کاسبینو",
  brandHref = "/dashboard",
  footer,
  label = "منوی اصلی",
}: AppSidebarNavProps) {
  const pathname = usePathname() ?? "/";
  const { hasPermission } = usePermissions();

  const visibleItems = items.filter((item) => {
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  return (
    <Sidebar collapsible="icon" side="right" variant="inset" dir="rtl">
      <SidebarHeader className="gap-1 px-4 py-5 text-center">
        <Link
          href={brandHref}
          className="flex items-center justify-center gap-2 rounded-xl px-1 text-lg font-bold text-sidebar-foreground transition-colors hover:text-sidebar-primary"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-base font-black text-sidebar-primary-foreground shadow-sm">
            ک
          </span>
          <span className="truncate text-xl font-black text-primary group-data-[collapsible=icon]:hidden">
            {brand}
          </span>
        </Link>
        <p className="text-[11px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
          مدیریت هوشمند کسب‌وکار
        </p>
      </SidebarHeader>
      <Separator className="opacity-40" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item);
                return (
                  <SidebarMenuItem key={item.href + item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {footer ? (
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          {footer}
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </Sidebar>
  );
}
