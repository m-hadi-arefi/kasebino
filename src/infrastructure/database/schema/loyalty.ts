/**
 * Loyalty OLTP tables (ADR-010 / ARD-009) — Drizzle schema stubs.
 *
 * Wallet unique per store_membership_id (store-first, ADR-091).
 * Points ledger append-only; unique earn per sale_id (partial index).
 * Money earn input as IRR minor; points as integer.
 *
 * Migrations via Drizzle Kit → ARD-009.
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const pointRules = pgTable(
  "point_rules",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    /** IRR minor units per earn unit */
    amountMinorPerPoint: bigint("amount_minor_per_point", {
      mode: "bigint",
    }).notNull(),
    pointsPerUnit: integer("points_per_unit").notNull(),
    /** Null = expiry disabled for this program */
    expiryMonthsAfterLastEarn: integer("expiry_months_after_last_earn"),
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
    uniqueIndex("point_rules_merchant_id_store_id_uq").on(
      t.merchantId,
      t.storeId,
    ),
    index("point_rules_store_id_idx").on(t.storeId),
  ],
);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    storeMembershipId: uuid("store_membership_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    balance: integer("balance").notNull(),
    version: integer("version").notNull(),
    lastEarnAt: timestamp("last_earn_at", {
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
    uniqueIndex("wallets_store_membership_id_uq").on(t.storeMembershipId),
    index("wallets_merchant_id_store_id_idx").on(t.merchantId, t.storeId),
    index("wallets_customer_id_idx").on(t.customerId),
    index("wallets_last_earn_at_idx").on(t.lastEarnAt),
  ],
);

export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: uuid("id").primaryKey(),
    walletId: uuid("wallet_id").notNull(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    storeMembershipId: uuid("store_membership_id").notNull(),
    /** earn | redeem | expire */
    entryType: varchar("entry_type", { length: 16 }).notNull(),
    points: integer("points").notNull(),
    referenceId: varchar("reference_id", { length: 128 }),
    /** sale | order | expiry_job | pos_redeem */
    referenceKind: varchar("reference_kind", { length: 32 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("points_ledger_earn_sale_reference_uq")
      .on(t.referenceId)
      .where(
        sql`${t.entryType} = 'earn' and ${t.referenceKind} = 'sale' and ${t.referenceId} is not null`,
      ),
    index("points_ledger_wallet_id_created_at_idx").on(
      t.walletId,
      t.createdAt,
    ),
    index("points_ledger_store_membership_id_created_at_idx").on(
      t.storeMembershipId,
      t.createdAt,
    ),
    index("points_ledger_merchant_id_store_id_idx").on(t.merchantId, t.storeId),
  ],
);


