/**
 * ADR-097 catalog presentation — تومان helpers.
 */

import {
  formatTomanDisplay,
  moneyFromMinor,
  toToman,
} from "../../../shared/domain/money.js";

/** Format IRR minor (rial) as تومان display. */
export function formatCatalogToman(priceAmountMinor: string | number | bigint): string {
  const minor =
    typeof priceAmountMinor === "bigint"
      ? priceAmountMinor
      : BigInt(String(priceAmountMinor));
  return formatTomanDisplay(moneyFromMinor(minor));
}

/** تومان integer → IRR minor units (1 تومان = 10 ریال). */
export function tomanToMinor(toman: number | string): bigint {
  const n =
    typeof toman === "string"
      ? Number(toman.replace(/[^\d.-]/g, ""))
      : toman;
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error("invalid_toman");
  }
  return BigInt(n) * 10n;
}

/** IRR minor → تومان integer for form fields. */
export function minorToTomanInt(priceAmountMinor: string | number | bigint): number {
  const money = moneyFromMinor(
    typeof priceAmountMinor === "bigint"
      ? priceAmountMinor
      : BigInt(String(priceAmountMinor)),
  );
  return Number(toToman(money));
}

export function formatInventoryJalali(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
