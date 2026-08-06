import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  children?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = "خطا در بارگذاری",
  description = "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
  retryLabel = "تلاش مجدد",
  onRetry,
  children,
  className,
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={cn("shadow-sm", className)} role="alert">
      <AlertTriangle className="size-4" aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{description}</span>
        {children}
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit border-destructive/40 bg-background text-foreground"
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
