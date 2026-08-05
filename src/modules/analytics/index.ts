/**
 * Analytics module — merchant OLTP projections (ADR-063 / ARD-016).
 * HTTP APIs + Drizzle Kit migrations + uiuxpromax widgets remain ARD-016 / ADR-088.
 */

export * from "./application/index.js";
export * from "./domain/index.js";
export * from "./infrastructure/index.js";
export {
  MERCHANT_OLTP_ANALYTICS_PACKAGE,
  MERCHANT_OLTP_CACHE,
  MERCHANT_OLTP_DASHBOARD_DECISION,
  MERCHANT_OLTP_TITLES_FA,
  MERCHANT_OLTP_UX_FA,
  InMemoryMembershipCountersPort,
  InMemorySalesCountersPort,
  assertCacheTtl60Seconds,
  assertPersianTitles,
  buildMerchantOverview,
  northStarRollingRange,
  stubJalaliRange,
} from "../../merchant-oltp-analytics/index.js";
