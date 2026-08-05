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
  active: "default",
  suspended: "destructive",
  pending: "secondary",
  cancelled: "outline",
  ready: "default",
  preparing: "secondary",
  completed: "outline",
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

  return (
    <Badge
      variant={variant}
      dir="rtl"
      lang="fa"
      className={cn("min-h-8 px-3 text-xs font-medium", className)}
      data-status={status}
    >
      {text}
    </Badge>
  );
}
