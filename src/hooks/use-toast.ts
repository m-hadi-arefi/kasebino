import { toast as sonnerToast } from "sonner";
import type React from "react";

export interface ToastProps {
  title?: string;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
}

export function toast({ title, description, variant }: ToastProps) {
  if (variant === "destructive") {
    sonnerToast.error(title || "خطا", {
      description: description as string | undefined,
    });
  } else {
    sonnerToast.success(title || "", {
      description: description as string | undefined,
    });
  }
}

export function useToast() {
  return { toast };
}
