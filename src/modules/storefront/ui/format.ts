/**
 * ADR-100 storefront presentation — تومان + Jalali helpers.
 */

import {
  formatTomanDisplay,
  moneyFromMinor,
} from "../../../shared/domain/money.js";
import { WEEKDAY_LABELS_FA } from "./copy.js";

export function formatStorefrontToman(
  priceAmountMinor: string | number | bigint,
): string {
  const minor =
    typeof priceAmountMinor === "bigint"
      ? priceAmountMinor
      : BigInt(String(priceAmountMinor));
  return formatTomanDisplay(moneyFromMinor(minor));
}

export function formatStorefrontJalali(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Rough unpaid deadline = now + 30m, Jalali (ADR-091). */
export function formatUnpaidDeadlineJalali(from: Date = new Date()): string {
  const deadline = new Date(from.getTime() + 30 * 60 * 1000);
  return formatStorefrontJalali(deadline);
}

export function formatDayHoursFa(
  open: string | null | undefined,
  close: string | null | undefined,
): string {
  if (!open || !close) return "تعطیل";
  return `${open} تا ${close}`;
}

export function formatHoursRowFa(
  weekdayKey: string,
  hours: { open: string; close: string } | null | undefined,
): string {
  const day = WEEKDAY_LABELS_FA[weekdayKey] ?? weekdayKey;
  if (!hours) return `${day}: تعطیل`;
  return `${day}: ${formatDayHoursFa(hours.open, hours.close)}`;
}
