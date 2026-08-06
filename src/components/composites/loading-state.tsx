import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type LoadingStateProps = {
  rows?: number;
  className?: string;
  label?: string;
};

export function LoadingState({
  rows = 4,
  className,
  label = "در حال بارگذاری…",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("flex flex-col gap-3", className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <Skeleton className="mb-3 h-4 w-1/3" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
