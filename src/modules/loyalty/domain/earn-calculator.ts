/**
 * PointsEarnCalculator domain service (ADR-010).
 */

import type { PointRule } from "./point-rule.js";

/**
 * Floor division: how many whole point units from sale total (IRR minor).
 */
export function calculateEarnPoints(
  totalAmountMinor: bigint,
  rule: PointRule,
): number {
  if (totalAmountMinor <= 0n) {
    return 0;
  }
  const units = totalAmountMinor / rule.amountMinorPerPoint;
  if (units <= 0n) {
    return 0;
  }
  const points = Number(units) * rule.pointsPerUnit;
  if (!Number.isSafeInteger(points) || points < 1) {
    return 0;
  }
  return points;
}
