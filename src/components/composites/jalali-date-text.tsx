import { cn } from "@/lib/utils";
import { formatJalaliFa } from "./iranian-defaults";

export type JalaliDateTextProps = {
  value: string | Date;
  className?: string;
};

/** User-facing Jalali date/time (Asia/Tehran). */
export function JalaliDateText({ value, className }: JalaliDateTextProps) {
  return (
    <time
      dateTime={typeof value === "string" ? value : value.toISOString()}
      dir="rtl"
      lang="fa"
      className={cn("tabular-nums text-foreground", className)}
    >
      {formatJalaliFa(value)}
    </time>
  );
}
