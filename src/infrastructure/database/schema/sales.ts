/**
 * Sales OLTP tables (ADR-009 / ARD-007) — Drizzle schema stubs.
 *
 * CompleteSale UoW persists Sale + SaleLine; tender_type per ADR-091.
 * Idempotency unique per merchant. Money as integer IRR minor units.
 * Phone national captured for membership linkage (ADR-007).
 *
 * Migrations via Drizzle Kit → ARD-007.
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

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    membershipId: uuid("membership_id"),
    customerId: uuid("customer_id"),
    /** Iranian national mobile: 09xxxxxxxxx */
    phoneNational: varchar("phone_national", { length: 11 }).notNull(),
    /** cash | card_terminal | mixed (ADR-091) */
    tenderType: varchar("tender_type", { length: 32 }).notNull(),
    /** IRR minor units (rial) total */
    totalAmountMinor: bigint("total_amount_minor", { mode: "bigint" }).notNull(),
    /** completed | canceled */
    status: varchar("status", { length: 32 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    uniqueIndex("sales_merchant_id_idempotency_key_uq").on(
      t.merchantId,
      t.idempotencyKey,
    ),
    index("sales_merchant_id_store_id_completed_at_idx").on(
      t.merchantId,
      t.storeId,
      t.completedAt,
    ),
    index("sales_store_id_completed_at_idx").on(t.storeId, t.completedAt),
    index("sales_membership_id_idx").on(t.membershipId),
    index("sales_customer_id_idx").on(t.customerId),
    index("sales_merchant_id_status_idx").on(t.merchantId, t.status),
  ],
);

export const saleLines = pgTable(
  "sale_lines",
  {
    id: uuid("id").primaryKey(),
    saleId: uuid("sale_id").notNull(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    /** Persian product name snapshot (UTF-8). */
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    lineTotalMinor: bigint("line_total_minor", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("sale_lines_sale_id_idx").on(t.saleId),
    index("sale_lines_merchant_id_store_id_idx").on(t.merchantId, t.storeId),
    index("sale_lines_product_id_idx").on(t.productId),
  ],
);
