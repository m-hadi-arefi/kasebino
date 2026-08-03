/**
 * Analytics OLTP projections — domain read models (ADR-063 / ARD-016).
 * Not write-side aggregates; updated from SaleCompleted / OrderPaid /
 * CustomerReturned. Money truth stays PostgreSQL.
 */

export type {
  AnalyticsDateRange,
  DailyRevenueProjection,
  IsoDay,
  MerchantOverviewProjection,
  MembershipCountersPort,
  SalesCountersPort,
} from "../../../merchant-oltp-analytics/index.js";

export {
  MERCHANT_OLTP_CONSUMED_EVENTS,
  MERCHANT_OLTP_DASHBOARD_DECISION,
  MERCHANT_OLTP_TITLES_FA,
  isIsoDay,
  toIsoDay,
  type MerchantOltpConsumedEvent,
} from "../../../merchant-oltp-analytics/index.js";

/** Projection repository port — Drizzle adapter follows ARD-016 migrations. */
export type AnalyticsProjectionRepository = {
  upsertDailyRevenue(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    salesCountDelta: number;
    revenueMinorDelta: bigint;
  }): Promise<void>;
  findDailyRevenue(input: {
    merchantId: string;
    storeId?: string | null;
    fromDay: string;
    toDay: string;
  }): Promise<
    Array<{
      merchantId: string;
      storeId: string | null;
      day: string;
      salesCount: number;
      revenueMinor: bigint;
    }>
  >;
};
