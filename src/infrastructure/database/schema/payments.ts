/**
 * Payments OLTP table (ADR-012 / ARD-012) — Drizzle schema stub.
 *
 * PaymentIntent for pickup online orders; money as IRR minor units.
 * provider_ref unique when present. Fees inactive for Kerman pilot (ADR-091).
 *
 * Migrations via Drizzle Kit → ARD-012.
 */

import {
  bigint,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    orderId: uuid("order_id").notNull(),
    /** IRR minor units (rial) */
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    /**
     * requires_payment | processing | succeeded | failed | cancelled | refunded
     */
    status: varchar("status", { length: 32 }).notNull(),
    /** sandbox until ADR-084 Accepted */
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    providerRef: varchar("provider_ref", { length: 191 }),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    /** Always 0 while ADR-091 Kerman pilot fees inactive */
    feeChargedMinor: bigint("fee_charged_minor", { mode: "bigint" }).notNull(),
    failureCode: varchar("failure_code", { length: 64 }),
    paidAt: timestamp("paid_at", {
      withTimezone: true,
      mode: "date",
    }),
    refundedAt: timestamp("refunded_at", {
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
  },
  (t) => [
    uniqueIndex("payments_merchant_id_idempotency_key_uq").on(
      t.merchantId,
      t.idempotencyKey,
    ),
    uniqueIndex("payments_provider_ref_uq").on(t.providerRef),
    index("payments_merchant_id_order_id_idx").on(t.merchantId, t.orderId),
    index("payments_merchant_id_status_created_at_idx").on(
      t.merchantId,
      t.status,
      t.createdAt,
    ),
    index("payments_order_id_idx").on(t.orderId),
  ],
);
