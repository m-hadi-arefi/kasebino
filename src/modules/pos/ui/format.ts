/**
 * ADR-096 POS presentation helpers — تومان + Jalali (fa-IR / Asia/Tehran).
 */

import { formatTomanDisplay, moneyFromMinor } from "../../../shared/domain/money.js";

/** Format IRR minor units as تومان display string. */
export function formatPosToman(unitPriceMinor: number | bigint): string {
  const minor =
    typeof unitPriceMinor === "bigint"
      ? unitPriceMinor
      : BigInt(Math.trunc(unitPriceMinor));
  return formatTomanDisplay(moneyFromMinor(minor));
}

export function cartTotalMinor(
  lines: readonly { quantity: number; unitPriceMinor: number }[],
): number {
  return lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceMinor,
    0,
  );
}

/** User-facing Jalali datetime in Iran TZ. */
export function formatPosJalaliDateTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
