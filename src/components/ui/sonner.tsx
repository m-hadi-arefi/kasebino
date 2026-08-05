"use client";

import { Toaster as Sonner } from "sonner";

import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toast host (Sonner). Client-only to avoid SSR/CSR flash.
 * Defaults to RTL for Iranian First; no ThemeProvider hard-dep.
 */
const Toaster = ({
  theme = "light",
  className,
  dir = "rtl",
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      dir={dir}
      className={cn("toaster group", className)}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
