/**
 * CRM segment policy & extensible rule engine.
 *
 * Predefined V1 segments:
 * - new: recent creation or <= 1 purchase
 * - active: purchase in last 60 days
 * - inactive: > 60 days since last purchase
 * - high_value: total spend >= 100,000,000 IRR (10,000,000 Toman)
 * - frequent: >= 5 purchases
 * - debtors: has outstanding debt balance in ERPNext
 *
 * Legacy membership segment values ("new", "returning", "lapsed") remain supported.
 */

export const CRM_SEGMENTS = [
  "new",
  "returning",
  "lapsed",
  "active",
  "inactive",
  "high_value",
  "frequent",
  "debtors",
] as const;

export type CrmSegment = (typeof CRM_SEGMENTS)[number];

export const CRM_SEGMENT_POLICY = {
  lapsedAfterDays: 60,
  returningMinPurchases: 2,
  highValueThresholdMinor: 100_000_000n, // 10 Million Toman
  frequentMinPurchases: 5,
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
  averageOrderValueMinor: bigint;
  firstPurchaseAt: Date | null;
  lastPurchaseAt: Date | null;
  segment: CrmSegment;
  activeSegments: CrmSegment[];
};

export function isCrmSegment(value: string): value is CrmSegment {
  return (CRM_SEGMENTS as readonly string[]).includes(value);
}

export function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / MS_PER_DAY);
}

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
  outstandingBalanceMinor?: bigint;
  now?: Date;
}): MembershipEngagementStats {
  const now = input.now ?? new Date();
  const sorted = [...input.completedSales].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime(),
  );
  const purchaseCount = sorted.length;
  let totalSpendMinor = 0n;
  for (const sale of sorted) {
    totalSpendMinor += sale.totalAmountMinor;
  }

  const averageOrderValueMinor =
    purchaseCount > 0 ? totalSpendMinor / BigInt(purchaseCount) : 0n;

  const legacySegment = computeMembershipSegment({
    completedSales: sorted,
    now,
  });

  const activeSegments: CrmSegment[] = [legacySegment];

  if (purchaseCount === 0) {
    activeSegments.push("new");
  } else {
    const lastDate = sorted[purchaseCount - 1]!.completedAt;
    if (daysSince(lastDate, now) <= CRM_SEGMENT_POLICY.lapsedAfterDays) {
      activeSegments.push("active");
    } else {
      activeSegments.push("inactive");
    }
  }

  if (totalSpendMinor >= CRM_SEGMENT_POLICY.highValueThresholdMinor) {
    activeSegments.push("high_value");
  }

  if (purchaseCount >= CRM_SEGMENT_POLICY.frequentMinPurchases) {
    activeSegments.push("frequent");
  }

  if (
    input.outstandingBalanceMinor !== undefined &&
    input.outstandingBalanceMinor > 0n
  ) {
    activeSegments.push("debtors");
  }

  return {
    purchaseCount,
    totalSpendMinor,
    averageOrderValueMinor,
    firstPurchaseAt: sorted[0]?.completedAt ?? null,
    lastPurchaseAt: sorted[purchaseCount - 1]?.completedAt ?? null,
    segment: legacySegment,
    activeSegments,
  };
}

/** Dynamic Segment Condition definition for future extensible rule builder. */
export type SegmentCondition =
  | { type: "total_spend_gte"; valueMinor: bigint }
  | { type: "purchase_count_gte"; value: number }
  | { type: "last_purchase_days_gte"; days: number }
  | { type: "has_debt"; value: boolean }
  | { type: "tag_contains"; tagId: string };

export type SegmentRule = {
  id: string;
  name: string;
  conditions: SegmentCondition[];
  operator: "AND" | "OR";
};

export function evaluateSegmentRule(
  rule: SegmentRule,
  stats: MembershipEngagementStats,
  customerTags: string[] = [],
  outstandingBalanceMinor: bigint = 0n,
  now: Date = new Date(),
): boolean {
  const results = rule.conditions.map((cond) => {
    switch (cond.type) {
      case "total_spend_gte":
        return stats.totalSpendMinor >= cond.valueMinor;
      case "purchase_count_gte":
        return stats.purchaseCount >= cond.value;
      case "last_purchase_days_gte":
        return stats.lastPurchaseAt
          ? daysSince(stats.lastPurchaseAt, now) >= cond.days
          : true;
      case "has_debt":
        return (outstandingBalanceMinor > 0n) === cond.value;
      case "tag_contains":
        return customerTags.includes(cond.tagId);
      default:
        return false;
    }
  });

  if (rule.operator === "AND") {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}
