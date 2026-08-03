/**
 * PointsExpiryPolicy domain service (ADR-010 / ADR-091).
 * Default: expire full balance 12 months after last earn at this membership.
 */

import type { PointRule } from "./point-rule.js";
import type { Wallet } from "./wallet.js";

export function addCalendarMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Whether wallet balance should expire at `now` given store PointRule.
 */
export function shouldExpireWallet(
  wallet: Wallet,
  rule: PointRule,
  now: Date = new Date(),
): boolean {
  if (rule.expiryMonthsAfterLastEarn === null) {
    return false;
  }
  if (wallet.balance <= 0) {
    return false;
  }
  if (wallet.lastEarnAt === null) {
    return false;
  }
  const expiresAt = addCalendarMonths(
    wallet.lastEarnAt,
    rule.expiryMonthsAfterLastEarn,
  );
  return now.getTime() >= expiresAt.getTime();
}

export function walletExpiresAt(
  wallet: Wallet,
  rule: PointRule,
): Date | null {
  if (
    rule.expiryMonthsAfterLastEarn === null ||
    wallet.lastEarnAt === null
  ) {
    return null;
  }
  return addCalendarMonths(
    wallet.lastEarnAt,
    rule.expiryMonthsAfterLastEarn,
  );
}
