import { cn } from "@/lib/utils";
import {
  formatTomanFa,
  TOMAN_PLACEHOLDER_FA,
  TOMAN_SUFFIX_FA,
} from "./iranian-defaults";

export type TomanDisplayProps = {
  /** Amount in تومان (integer). */
  toman: number | bigint;
  className?: string;
  /** Show explicit تومان suffix (default true via formatTomanFa). */
  showSuffix?: boolean;
};

/**
 * Persian تومان amount display (fa-IR grouping + explicit تومان).
 */
export function TomanDisplay({
  toman,
  className,
  showSuffix = true,
}: TomanDisplayProps) {
  const formatted = formatTomanFa(toman);
  const text = showSuffix
    ? formatted
    : formatted.replace(/\s*تومان\s*$/u, "").trim();

  return (
    <span
      dir="rtl"
      lang="fa"
      className={cn("inline-block tabular-nums text-foreground", className)}
      data-currency={TOMAN_SUFFIX_FA}
      data-placeholder={TOMAN_PLACEHOLDER_FA}
    >
      {text}
    </span>
  );
}
