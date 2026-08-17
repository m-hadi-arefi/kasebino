/**
 * Analytics OLTP projections — domain read models (ADR-063 / ADR-106 / ARD-016).
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
} from "./merchant-oltp/index.js";

export {
  MERCHANT_OLTP_CONSUMED_EVENTS,
  MERCHANT_OLTP_DASHBOARD_DECISION,
  MERCHANT_OLTP_TITLES_FA,
  isIsoDay,
  toIsoDay,
  toTehranIsoDay,
  type MerchantOltpConsumedEvent,
} from "./merchant-oltp/index.js";

/** Projection repository port — Drizzle adapter (ADR-106). */
export type AnalyticsProjectionRepository = {
  /** Returns false when eventId already applied (idempotent). */
  tryBeginEvent(input: {
    eventId: string;
    merchantId: string;
    appliedAt: Date;
  }): Promise<boolean>;

  upsertDailyRevenue(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    salesCountDelta: number;
    revenueMinorDelta: bigint;
  }): Promise<void>;

  upsertCustomerStats(row: {
    merchantId: string;
    storeId: string | null;
    day: string;
    newMembershipsDelta?: number;
    salesWithPhoneDelta?: number;
  }): Promise<void>;

  upsertRetentionPurchase(row: {
    merchantId: string;
    storeId: string | null;
    membershipId: string;
    day: string;
    purchaseCountDelta: number;
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

  countMonthlyReturningFromProjection(input: {
    merchantId: string;
    storeId?: string | null;
    fromDay: string;
    toDay: string;
  }): Promise<number>;
};
