/**
 * Analytics application — overview query + SaleCompleted projection apply
 * (ADR-063). Stays off checkout critical path (invoke after OLTP commit).
 */

import {
  buildMerchantOverview,
  stubJalaliRange,
  toIsoDay,
  type AnalyticsDateRange,
  type MembershipCountersPort,
  type MerchantOverviewProjection,
  type SalesCountersPort,
} from "../../../merchant-oltp-analytics/index.js";
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

/** Apply SaleCompleted into daily revenue projection (idempotent deltas). */
export type ApplySaleCompletedInput = {
  eventId: string;
  merchantId: string;
  storeId?: string | null;
  occurredAt: Date | string;
  revenueMinor: bigint;
  /** Optional duplicate guard key — when already applied, no-op. */
};

export type AnalyticsProjectionHandler = {
  applySaleCompleted(input: ApplySaleCompletedInput): Promise<"applied" | "duplicate">;
};

export function createAnalyticsProjectionHandler(deps: {
  projections: AnalyticsProjectionRepository;
  processedEventIds?: Set<string>;
}): AnalyticsProjectionHandler {
  const processed = deps.processedEventIds ?? new Set<string>();
  return {
    async applySaleCompleted(input) {
      if (!input.eventId?.trim()) {
        throw new Error("SaleCompleted projection apply requires eventId (ADR-063).");
      }
      if (!input.merchantId?.trim()) {
        throw new Error(
          "SaleCompleted projection apply requires merchantId (ADR-063).",
        );
      }
      if (processed.has(input.eventId)) {
        return "duplicate";
      }
      const occurred =
        typeof input.occurredAt === "string"
          ? new Date(input.occurredAt)
          : input.occurredAt;
      const day = toIsoDay(occurred);
      await deps.projections.upsertDailyRevenue({
        merchantId: input.merchantId,
        storeId: input.storeId ?? null,
        day,
        salesCountDelta: 1,
        revenueMinorDelta: input.revenueMinor,
      });
      processed.add(input.eventId);
      return "applied";
    },
  };
}

export { stubJalaliRange };
