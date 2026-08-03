/**
 * Orders OLTP tables (ADR-011 / ARD-011) — Drizzle schema stubs.
 *
 * Pickup-only Order + OrderLine; no shipping address columns.
 * Status machine: pending_payment → … → completed | cancelled | refunded.
 * Money as integer IRR minor units. Persian product name snapshots UTF-8.
 *
 * Migrations via Drizzle Kit → ARD-011.
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

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    membershipId: uuid("membership_id"),
    customerId: uuid("customer_id"),
    /** Fixed pickup for MVP (ADR-011 / ADR-082). */
    fulfillmentMode: varchar("fulfillment_mode", { length: 32 }).notNull(),
    /**
     * pending_payment | paid | preparing | ready_for_pickup |
     * picked_up | completed | cancelled | refunded
     */
    status: varchar("status", { length: 32 }).notNull(),
    /** IRR minor units (rial) total */
    totalAmountMinor: bigint("total_amount_minor", { mode: "bigint" }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    pendingPaymentAt: timestamp("pending_payment_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    paidAt: timestamp("paid_at", {
      withTimezone: true,
      mode: "date",
    }),
    preparingAt: timestamp("preparing_at", {
      withTimezone: true,
      mode: "date",
    }),
    readyForPickupAt: timestamp("ready_for_pickup_at", {
      withTimezone: true,
      mode: "date",
    }),
    pickedUpAt: timestamp("picked_up_at", {
      withTimezone: true,
      mode: "date",
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "date",
    }),
    refundedAt: timestamp("refunded_at", {
      withTimezone: true,
      mode: "date",
    }),
    cancelReason: text("cancel_reason"),
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
    uniqueIndex("orders_merchant_id_idempotency_key_uq").on(
      t.merchantId,
      t.idempotencyKey,
    ),
    index("orders_merchant_id_store_id_status_created_at_idx").on(
      t.merchantId,
      t.storeId,
      t.status,
      t.createdAt,
    ),
    index("orders_store_id_status_created_at_idx").on(
      t.storeId,
      t.status,
      t.createdAt,
    ),
    index("orders_customer_id_created_at_idx").on(t.customerId, t.createdAt),
    index("orders_status_pending_payment_at_idx").on(
      t.status,
      t.pendingPaymentAt,
    ),
    index("orders_status_ready_for_pickup_at_idx").on(
      t.status,
      t.readyForPickupAt,
    ),
  ],
);

export const orderLines = pgTable(
  "order_lines",
  {
    id: uuid("id").primaryKey(),
    orderId: uuid("order_id").notNull(),
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
    index("order_lines_order_id_idx").on(t.orderId),
    index("order_lines_merchant_id_store_id_idx").on(t.merchantId, t.storeId),
    index("order_lines_product_id_idx").on(t.productId),
  ],
);
