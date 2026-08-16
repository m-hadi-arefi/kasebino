import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  statusLabelFa,
  type StatusChipKey,
  STATUS_CHIP_LABELS_FA,
} from "./iranian-defaults";

const VARIANT_BY_STATUS: Record<
  StatusChipKey,
  NonNullable<BadgeProps["variant"]>
> = {
  active: "secondary",
  suspended: "destructive",
  pending: "outline",
  cancelled: "destructive",
  ready: "secondary",
  preparing: "outline",
  completed: "secondary",
};

export type StatusChipProps = {
  status: StatusChipKey | string;
  className?: string;
  label?: string;
};

/**
 * Compact Persian status chip built on Badge.
 */
export function StatusChip({ status, className, label }: StatusChipProps) {
  const text = label ?? statusLabelFa(status);
  const variant =
    status in STATUS_CHIP_LABELS_FA
      ? VARIANT_BY_STATUS[status as StatusChipKey]
      : "secondary";

  const dotColor =
    variant === "secondary"
      ? "bg-secondary"
      : variant === "destructive"
        ? "bg-destructive"
        : "bg-muted-foreground";

  return (
    <Badge
      variant={variant}
      dir="rtl"
      lang="fa"
      className={cn("min-h-7 px-2.5 py-0.5 text-xs font-medium gap-1.5", className)}
      data-status={status}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", dotColor)} aria-hidden />
      {text}
    </Badge>
  );
}
