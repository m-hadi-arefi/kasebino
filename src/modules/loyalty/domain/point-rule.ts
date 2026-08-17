/**
 * PointRule aggregate (ADR-010) — store-scoped earn + expiry config.
 */

import { LOYALTY_DECISION } from "./contracts/index.js";
import { LOYALTY_EXPIRY_POLICY } from "../../../shared/contracts/mvp-policies/index.js";

export type PointRule = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  /** IRR minor units required to earn `pointsPerUnit` points. */
  amountMinorPerPoint: bigint;
  pointsPerUnit: number;
  /**
   * Months after last earn before full balance expires.
   * `null` = expiry disabled for this store program.
   */
  expiryMonthsAfterLastEarn: number | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CreatePointRuleInput = {
  id: string;
  merchantId: string;
  storeId: string;
  amountMinorPerPoint?: bigint;
  pointsPerUnit?: number;
  expiryMonthsAfterLastEarn?: number | null;
  now?: Date;
};

export function createPointRule(input: CreatePointRuleInput): PointRule {
  const now = input.now ?? new Date();
  const amountMinorPerPoint =
    input.amountMinorPerPoint ?? LOYALTY_DECISION.defaultAmountMinorPerPoint;
  const pointsPerUnit =
    input.pointsPerUnit ?? LOYALTY_DECISION.defaultPointsPerUnit;
  const expiryMonthsAfterLastEarn =
    input.expiryMonthsAfterLastEarn === undefined
      ? LOYALTY_EXPIRY_POLICY.defaultMonthsAfterLastEarn
      : input.expiryMonthsAfterLastEarn;

  if (amountMinorPerPoint <= 0n) {
    throw new Error("amountMinorPerPoint must be positive");
  }
  if (!Number.isInteger(pointsPerUnit) || pointsPerUnit < 1) {
    throw new Error("pointsPerUnit must be a positive integer");
  }
  if (
    expiryMonthsAfterLastEarn !== null &&
    (!Number.isInteger(expiryMonthsAfterLastEarn) ||
      expiryMonthsAfterLastEarn < 1)
  ) {
    throw new Error("expiryMonthsAfterLastEarn must be null or >= 1");
  }

  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId,
    amountMinorPerPoint,
    pointsPerUnit,
    expiryMonthsAfterLastEarn,
    createdAt: now,
    updatedAt: now,
  };
}

export function updatePointRule(
  rule: PointRule,
  patch: {
    amountMinorPerPoint?: bigint;
    pointsPerUnit?: number;
    expiryMonthsAfterLastEarn?: number | null;
  },
  at: Date = new Date(),
): void {
  if (patch.amountMinorPerPoint !== undefined) {
    if (patch.amountMinorPerPoint <= 0n) {
      throw new Error("amountMinorPerPoint must be positive");
    }
    rule.amountMinorPerPoint = patch.amountMinorPerPoint;
  }
  if (patch.pointsPerUnit !== undefined) {
    if (!Number.isInteger(patch.pointsPerUnit) || patch.pointsPerUnit < 1) {
      throw new Error("pointsPerUnit must be a positive integer");
    }
    rule.pointsPerUnit = patch.pointsPerUnit;
  }
  if (patch.expiryMonthsAfterLastEarn !== undefined) {
    if (
      patch.expiryMonthsAfterLastEarn !== null &&
      (!Number.isInteger(patch.expiryMonthsAfterLastEarn) ||
        patch.expiryMonthsAfterLastEarn < 1)
    ) {
      throw new Error("expiryMonthsAfterLastEarn must be null or >= 1");
    }
    rule.expiryMonthsAfterLastEarn = patch.expiryMonthsAfterLastEarn;
  }
  rule.updatedAt = at;
}
