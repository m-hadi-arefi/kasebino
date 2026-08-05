/**
 * ADR-099 loyalty presentation — تومان + Jalali (Asia/Tehran).
 */

import {
  formatTomanDisplay,
  moneyFromMinor,
} from "../../../shared/domain/money.js";
import { LOYALTY_UI_COPY_FA } from "./copy.js";

export function formatLoyaltyToman(
  amountMinor: string | number | bigint,
): string {
  const minor =
    typeof amountMinor === "bigint"
      ? amountMinor
      : BigInt(String(amountMinor));
  return formatTomanDisplay(moneyFromMinor(minor));
}

/** IRR minor → تومان integer for merchant rule inputs. */
export function minorToTomanInput(amountMinor: string | bigint): string {
  const minor =
    typeof amountMinor === "bigint" ? amountMinor : BigInt(amountMinor);
  return (minor / 10n).toString();
}

/** تومان input → IRR minor for API. */
export function tomanInputToMinor(tomanRaw: string): bigint | null {
  const cleaned = tomanRaw.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  try {
    return BigInt(cleaned) * 10n;
  } catch {
    return null;
  }
}

export function formatLoyaltyJalali(iso: string | null | undefined): string {
  if (!iso) return LOYALTY_UI_COPY_FA.noDate;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function ledgerEntryLabelFa(entryType: string): string {
  switch (entryType) {
    case "earn":
      return LOYALTY_UI_COPY_FA.entryEarn;
    case "redeem":
      return LOYALTY_UI_COPY_FA.entryRedeem;
    case "expire":
      return LOYALTY_UI_COPY_FA.entryExpire;
    default:
      return entryType;
  }
}
