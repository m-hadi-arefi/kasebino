"use client";

import type { ComponentProps } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type SearchInputProps = Omit<ComponentProps<"input">, "type"> & {
  containerClassName?: string;
};

export function SearchInput({
  className,
  containerClassName,
  placeholder = "جستجو…",
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full max-w-md", containerClassName)}>
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        placeholder={placeholder}
        className={cn("min-h-11 ps-10", className)}
        {...props}
      />
    </div>
  );
}
