/**
 * Analytics application — AN-01..04 queries + SaleCompleted projection apply
 * (ADR-063 / ADR-106). Stays off checkout critical path (invoke after OLTP commit).
 */

import {
  buildMerchantOverview,
  MERCHANT_OLTP_TITLES_FA,
  northStarRollingRange,
  stubJalaliRange,
  toIsoDay,
  type AnalyticsDateRange,
  type MembershipCountersPort,
  type MerchantOverviewProjection,
  type SalesCountersPort,
} from "../domain/merchant-oltp/index.js";
import type { AnalyticsProjectionRepository } from "../domain/projections.js";

export type GetMerchantOverviewInput = {
  merchantId: string;
  storeId?: string | null;
  range?: AnalyticsDateRange;
};

export type AnalyticsOverviewUseCases = {
  getOverview(
    input: GetMerchantOverviewInput,
  ): Promise<MerchantOverviewProjection>;
};

export function createAnalyticsOverviewUseCases(deps: {
  sales: SalesCountersPort;
  memberships: MembershipCountersPort;
  now?: () => Date;
}): AnalyticsOverviewUseCases {
  return {
    async getOverview(input) {
      return buildMerchantOverview({
        merchantId: input.merchantId,
        storeId: input.storeId ?? null,
        ...(input.range !== undefined ? { range: input.range } : {}),
        sales: deps.sales,
        memberships: deps.memberships,
        ...(deps.now !== undefined ? { now: deps.now } : {}),
      });
    },
  };
}

export type MerchantRevenueProjection = {
  merchantId: string;
  storeId: string | null;
  capability: "AN-02";
  titleFa: string;
  range: AnalyticsDateRange;
  salesCount: number;
  revenueMinor: bigint;
  days: Array<{ day: string; salesCount: number; revenueMinor: bigint }>;
  moneyTruthStore: "postgresql_projections";
  cacheTtlSeconds: 60;
  generatedAt: string;
};

export type MerchantCustomersProjection = {
  merchantId: string;
  storeId: string | null;
  capability: "AN-03";
  titleFa: string;
  range: AnalyticsDateRange;
  activeMemberships: number;
  newMemberships: number;
  cacheTtlSeconds: 60;
  generatedAt: string;
};

export type MerchantRetentionProjection = {
  merchantId: string;
  storeId: string | null;
  capability: "AN-04";
  titleFa: string;
  northStarTitleFa: string;
  range: AnalyticsDateRange;
  /** North Star: Monthly Returning Customers. */
  monthlyReturningCustomers: number;
  cacheTtlSeconds: 60;
  generatedAt: string;
};

export type AnalyticsDashboardUseCases = AnalyticsOverviewUseCases & {
  getRevenue(input: GetMerchantOverviewInput): Promise<MerchantRevenueProjection>;
  getCustomers(
    input: GetMerchantOverviewInput,
  ): Promise<MerchantCustomersProjection>;
  getRetention(
    input: GetMerchantOverviewInput,
  ): Promise<MerchantRetentionProjection>;
};

export function createAnalyticsDashboardUseCases(deps: {
  sales: SalesCountersPort;
  memberships: MembershipCountersPort;
  projections?: AnalyticsProjectionRepository;
  now?: () => Date;
}): AnalyticsDashboardUseCases {
  const overview = createAnalyticsOverviewUseCases(deps);
  const now = deps.now ?? (() => new Date());

  return {
    getOverview: overview.getOverview,

    async getRevenue(input) {
      if (!input.merchantId?.trim()) {
        throw new Error("Revenue widget requires merchantId (ADR-106).");
      }
      const range = input.range ?? stubJalaliRange({ now });
      const storeId = input.storeId ?? null;
      let days: Array<{
        day: string;
        salesCount: number;
        revenueMinor: bigint;
      }> = [];

      if (deps.projections) {
        const rows = await deps.projections.findDailyRevenue({
          merchantId: input.merchantId,
          storeId,
          fromDay: range.fromDay,
          toDay: range.toDay,
        });
        days = rows.map((r) => ({
          day: r.day,
          salesCount: r.salesCount,
          revenueMinor: r.revenueMinor,
        }));
      }

      const totals = await deps.sales.countCompletedSales({
        merchantId: input.merchantId,
        storeId,
        range,
      });

      if (days.length === 0 && totals.salesCount > 0) {
        days = [
          {
            day: range.toDay,
            salesCount: totals.salesCount,
            revenueMinor: totals.revenueMinor,
          },
        ];
      }

      return {
        merchantId: input.merchantId,
        storeId,
        capability: "AN-02",
        titleFa: MERCHANT_OLTP_TITLES_FA.revenue,
        range,
        salesCount: totals.salesCount,
        revenueMinor: totals.revenueMinor,
        days,
        moneyTruthStore: "postgresql_projections",
        cacheTtlSeconds: 60,
        generatedAt: now().toISOString(),
      };
    },

    async getCustomers(input) {
      if (!input.merchantId?.trim()) {
        throw new Error("Customers widget requires merchantId (ADR-106).");
      }
      const range = input.range ?? stubJalaliRange({ now });
      const storeId = input.storeId ?? null;
      const [activeMemberships, newMemberships] = await Promise.all([
        deps.memberships.countActiveMemberships({
          merchantId: input.merchantId,
          storeId,
        }),
        deps.memberships.countNewMemberships({
          merchantId: input.merchantId,
          storeId,
          range,
        }),
      ]);
      return {
        merchantId: input.merchantId,
        storeId,
        capability: "AN-03",
        titleFa: MERCHANT_OLTP_TITLES_FA.customers,
        range,
        activeMemberships,
        newMemberships,
        cacheTtlSeconds: 60,
        generatedAt: now().toISOString(),
      };
    },

    async getRetention(input) {
      if (!input.merchantId?.trim()) {
        throw new Error("Retention widget requires merchantId (ADR-106).");
      }
      const range = northStarRollingRange(now);
      const storeId = input.storeId ?? null;
      let monthlyReturningCustomers =
        await deps.sales.countMonthlyReturningCustomers({
          merchantId: input.merchantId,
          storeId,
          range,
        });

      if (monthlyReturningCustomers === 0 && deps.projections !== undefined) {
        monthlyReturningCustomers =
          await deps.projections.countMonthlyReturningFromProjection({
            merchantId: input.merchantId,
            storeId,
            fromDay: range.fromDay,
            toDay: range.toDay,
          });
      }

      return {
        merchantId: input.merchantId,
        storeId,
        capability: "AN-04",
        titleFa: MERCHANT_OLTP_TITLES_FA.retention,
        northStarTitleFa: MERCHANT_OLTP_TITLES_FA.northStar,
        range,
        monthlyReturningCustomers,
        cacheTtlSeconds: 60,
        generatedAt: now().toISOString(),
      };
    },
  };
}

/** Apply SaleCompleted into daily revenue + retention projections. */
export type ApplySaleCompletedInput = {
  eventId: string;
  merchantId: string;
  storeId?: string | null;
  membershipId?: string | null;
  occurredAt: Date | string;
  revenueMinor: bigint;
  hasPhone?: boolean;
};

export type AnalyticsProjectionHandler = {
  applySaleCompleted(
    input: ApplySaleCompletedInput,
  ): Promise<"applied" | "duplicate">;
};

export function createAnalyticsProjectionHandler(deps: {
  projections: AnalyticsProjectionRepository;
  /** Legacy in-memory guard; prefer projections.tryBeginEvent. */
  processedEventIds?: Set<string>;
}): AnalyticsProjectionHandler {
  const processed = deps.processedEventIds ?? new Set<string>();
  return {
    async applySaleCompleted(input) {
      if (!input.eventId?.trim()) {
        throw new Error(
          "SaleCompleted projection apply requires eventId (ADR-063).",
        );
      }
      if (!input.merchantId?.trim()) {
        throw new Error(
          "SaleCompleted projection apply requires merchantId (ADR-063).",
        );
      }

      const appliedAt = new Date();
      if (processed.has(input.eventId)) {
        return "duplicate";
      }
      const began = await deps.projections.tryBeginEvent({
        eventId: input.eventId,
        merchantId: input.merchantId,
        appliedAt,
      });
      if (!began) {
        processed.add(input.eventId);
        return "duplicate";
      }

      const occurred =
        typeof input.occurredAt === "string"
          ? new Date(input.occurredAt)
          : input.occurredAt;
      const day = toIsoDay(occurred);
      const storeId = input.storeId ?? null;

      await deps.projections.upsertDailyRevenue({
        merchantId: input.merchantId,
        storeId,
        day,
        salesCountDelta: 1,
        revenueMinorDelta: input.revenueMinor,
      });

      await deps.projections.upsertCustomerStats({
        merchantId: input.merchantId,
        storeId,
        day,
        salesWithPhoneDelta: input.hasPhone === false ? 0 : 1,
      });

      if (input.membershipId?.trim()) {
        await deps.projections.upsertRetentionPurchase({
          merchantId: input.merchantId,
          storeId,
          membershipId: input.membershipId,
          day,
          purchaseCountDelta: 1,
        });
      }

      processed.add(input.eventId);
      return "applied";
    },
  };
}

export { stubJalaliRange, northStarRollingRange };
