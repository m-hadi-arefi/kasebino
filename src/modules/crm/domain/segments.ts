/**
 * CRM segment policy (ADR-098 / CRM-03).
 * Computed on read from completed sales — no manual rebuild / projection table.
 *
 * Exclusive assignment (first match wins):
 * 1. lapsed — ≥1 completed sale AND last completedAt older than lapsedAfterDays
 * 2. returning — completed sale count ≥ returningMinPurchases AND not lapsed
 * 3. new — otherwise (0–1 purchases, recent activity)
 */

export const CRM_SEGMENTS = ["new", "returning", "lapsed"] as const;
export type CrmSegment = (typeof CRM_SEGMENTS)[number];

export const CRM_SEGMENT_POLICY = {
  /** Wall-clock days since last completed sale → lapsed (Asia/Tehran display context). */
  lapsedAfterDays: 60,
  /** Minimum completed sales to qualify as returning (when not lapsed). */
  returningMinPurchases: 2,
  timezone: "Asia/Tehran",
} as const;

const MS_PER_DAY = 86_400_000;

export type CompletedSaleRef = {
  completedAt: Date;
  totalAmountMinor: bigint;
};

export type MembershipEngagementStats = {
  purchaseCount: number;
  totalSpendMinor: bigint;
  firstPurchaseAt: Date | null;
  lastPurchaseAt: Date | null;
  segment: CrmSegment;
};

export function isCrmSegment(value: string): value is CrmSegment {
  return (CRM_SEGMENTS as readonly string[]).includes(value);
}

/** Days since `from` relative to `now` (floor of wall-clock days). */
export function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Assign exclusive CRM segment from completed sales.
 * Empty history → new.
 */
export function computeMembershipSegment(input: {
  completedSales: readonly CompletedSaleRef[];
  now?: Date;
}): CrmSegment {
  const now = input.now ?? new Date();
  const sorted = [...input.completedSales].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime(),
  );
  const count = sorted.length;
  if (count === 0) return "new";

  const last = sorted[count - 1]!.completedAt;
  if (daysSince(last, now) > CRM_SEGMENT_POLICY.lapsedAfterDays) {
    return "lapsed";
  }
  if (count >= CRM_SEGMENT_POLICY.returningMinPurchases) {
    return "returning";
  }
  return "new";
}

export function computeEngagementStats(input: {
  completedSales: readonly CompletedSaleRef[];
  now?: Date;
}): MembershipEngagementStats {
  const sorted = [...input.completedSales].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime(),
  );
  const purchaseCount = sorted.length;
  let totalSpendMinor = 0n;
  for (const sale of sorted) {
    totalSpendMinor += sale.totalAmountMinor;
  }
  return {
    purchaseCount,
    totalSpendMinor,
    firstPurchaseAt: sorted[0]?.completedAt ?? null,
    lastPurchaseAt: sorted[purchaseCount - 1]?.completedAt ?? null,
    segment: computeMembershipSegment({
      completedSales: sorted,
      ...(input.now !== undefined ? { now: input.now } : {}),
    }),
  };
}
