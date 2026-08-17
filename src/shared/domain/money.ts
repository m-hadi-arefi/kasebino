import { LOCALE_DEFAULTS } from "../architecture/product/index.js";

/**
 * Money as integer minor units of IRR (rial).
 * Display defaults to تومان per Iranian First / ADR-001.
 */
export type Money = {
  readonly amountMinor: bigint;
  readonly currency: "IRR";
};

export function moneyFromMinor(amountMinor: bigint | number): Money {
  const value = typeof amountMinor === "number" ? BigInt(amountMinor) : amountMinor;
  if (value < 0n) {
    throw new Error("Money amountMinor must be >= 0");
  }
  return { amountMinor: value, currency: "IRR" };
}

/** IRR rials → تومان (1 تومان = 10 ریال) for display layers. */
export function toToman(money: Money): bigint {
  return money.amountMinor / 10n;
}

export function moneyDisplayUnit(): typeof LOCALE_DEFAULTS.moneyDisplayUnit {
  return LOCALE_DEFAULTS.moneyDisplayUnit;
}

/**
 * Persian display string for merchant/customer surfaces.
 * Uses fa-IR grouping separators and explicit تومان label (Iranian First).
 */
export function formatTomanDisplay(money: Money): string {
  const toman = toToman(money);
  const grouped = Number(toman).toLocaleString("fa-IR");
  return `${grouped} تومان`;
}
