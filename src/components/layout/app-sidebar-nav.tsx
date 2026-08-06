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

  return (
    <Sidebar collapsible="icon" side="right" variant="inset">
      <SidebarHeader className="gap-2 px-3 py-4">
        <Link
          href={brandHref}
          className="flex items-center gap-2 rounded-md px-1 text-base font-semibold text-sidebar-foreground transition-colors hover:text-sidebar-primary"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sm text-sidebar-primary-foreground">
            ک
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {brand}
          </span>
        </Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
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
