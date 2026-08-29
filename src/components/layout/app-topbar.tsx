"use client";

import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type AppTopbarProps = {
  title?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  showSidebarTrigger?: boolean;
};

export function AppTopbar({
  title,
  leading,
  trailing,
  className,
  showSidebarTrigger = true,
}: AppTopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/40 bg-background/95 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/95 sm:px-6",
        className,
      )}
    >
      {showSidebarTrigger ? (
        <>
          <SidebarTrigger className="-ms-1 hidden md:inline-flex" />
          <Separator orientation="vertical" className="hidden h-6 md:block" />
        </>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leading}
        {title ? (
          <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
            {title}
          </h1>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </header>
  );
}
