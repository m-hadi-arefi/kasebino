import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type FilterBarProps = {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function FilterBar({
  children,
  leading,
  trailing,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {leading}
        {children}
      </div>
      {trailing ? (
        <div className="flex flex-wrap items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}
