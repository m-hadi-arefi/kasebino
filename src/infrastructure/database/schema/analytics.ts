/**
 * Analytics OLTP projection tables (ADR-063 / ADR-106 / ARD-016).
 *
 * Merchant AN-01..04 read models. Money truth stays PostgreSQL.
 * Day keys are Asia/Tehran calendar days (ISO YYYY-MM-DD presentation).
 */

import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Daily revenue/sales counts per merchant (+ optional store). */
export const analyticsDailyRevenue = pgTable(
  "analytics_daily_revenue",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    /** Asia/Tehran calendar day YYYY-MM-DD */
    day: varchar("day", { length: 10 }).notNull(),
    salesCount: integer("sales_count").notNull().default(0),
    revenueMinor: bigint("revenue_minor", { mode: "bigint" }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("analytics_daily_revenue_merchant_store_day_uq").on(
      t.merchantId,
      t.storeId,
      t.day,
    ),
    index("analytics_daily_revenue_merchant_day_idx").on(t.merchantId, t.day),
  ],
);

/** Membership / customer capture counters per merchant/day. */
export const analyticsCustomerStats = pgTable(
  "analytics_customer_stats",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    day: varchar("day", { length: 10 }).notNull(),
    newMemberships: integer("new_memberships").notNull().default(0),
    salesWithPhone: integer("sales_with_phone").notNull().default(0),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("analytics_customer_stats_merchant_store_day_uq").on(
      t.merchantId,
      t.storeId,
      t.day,
    ),
    index("analytics_customer_stats_merchant_day_idx").on(t.merchantId, t.day),
  ],
);

/**
 * Retention North Star inputs — purchase counts per membership in rolling window.
 * Row aggregates purchases for a membership on a Tehran day.
 */
export const analyticsRetentionStats = pgTable(
  "analytics_retention_stats",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    day: varchar("day", { length: 10 }).notNull(),
    purchaseCount: integer("purchase_count").notNull().default(0),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("analytics_retention_stats_membership_day_uq").on(
      t.membershipId,
      t.day,
    ),
    index("analytics_retention_stats_merchant_day_idx").on(t.merchantId, t.day),
  ],
);

/** Idempotency for projection apply (SaleCompleted event ids). */
export const analyticsProjectionEvents = pgTable(
  "analytics_projection_events",
  {
    eventId: text("event_id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    appliedAt: timestamp("applied_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [index("analytics_projection_events_merchant_idx").on(t.merchantId)],
);
