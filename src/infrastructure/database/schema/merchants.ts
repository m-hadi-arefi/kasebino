/**
 * Merchant OLTP tables (ADR-005 / ARD-003) — Drizzle schema stub.
 *
 * Aligns with `src/database-modeling` (ADR-043):
 * - UUID PKs, snake_case plural tables
 * - UTC timestamptz audit columns + optional soft-delete
 * - Persian UTF-8 `text` / `varchar` for trade names
 * - merchants is tenant root (no merchant_id on itself)
 * - merchant_settings is tenant-owned (merchant_id required)
 *
 * Migrations via Drizzle Kit → `src/infrastructure/database/migrations/` (ARD-003).
 */

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

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey(),
    /** Persian trade / display name — UTF-8 text. */
    tradeName: text("trade_name").notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    /** draft | active | suspended */
    status: varchar("status", { length: 32 }).notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    contactPhoneNational: varchar("contact_phone_national", { length: 11 }),
    contactPhoneE164: varchar("contact_phone_e164", { length: 16 }),
    /** MVP always true (ADR-091 multi-store). */
    multiStoreEnabled: boolean("multi_store_enabled").notNull().default(true),
    /** Typed settings JSON stub until normalized columns expand. */
    settingsJson: text("settings_json"),
    activatedAt: timestamp("activated_at", {
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
    uniqueIndex("merchants_slug_uq").on(t.slug),
    index("merchants_status_idx").on(t.status),
    index("merchants_owner_user_id_idx").on(t.ownerUserId),
  ],
);

export const merchantSettings = pgTable(
  "merchant_settings",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    key: varchar("key", { length: 128 }).notNull(),
    valueJson: text("value_json").notNull(),
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
    uniqueIndex("merchant_settings_merchant_id_key_uq").on(
      t.merchantId,
      t.key,
    ),
    index("merchant_settings_merchant_id_idx").on(t.merchantId),
  ],
);

export const merchantSubscriptions = pgTable(
  "merchant_subscriptions",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    /** pilot | free | pro | enterprise */
    planCode: varchar("plan_code", { length: 32 }).notNull().default("pilot"),
    /** Basis points transaction fee (e.g. 0 for pilot, 150 = 1.5%). Default 0. */
    feeBps: integer("fee_bps").notNull().default(0),
    /** JSON array of enabled feature flag keys. */
    featuresJson: text("features_json"),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    expiresAt: timestamp("expires_at", {
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
    uniqueIndex("merchant_subscriptions_merchant_id_uq").on(t.merchantId),
    index("merchant_subscriptions_plan_code_idx").on(t.planCode),
  ],
);

export const merchantCreditLedger = pgTable(
  "merchant_credit_ledger",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    /** IRR minor units (rial). Delta amount: positive for topup, negative for usage. */
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    /** topup | sms_campaign | system_grant | adjustment */
    reason: varchar("reason", { length: 64 }).notNull(),
    referenceId: varchar("reference_id", { length: 128 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("merchant_credit_ledger_merchant_id_idx").on(t.merchantId),
    index("merchant_credit_ledger_merchant_created_idx").on(
      t.merchantId,
      t.createdAt,
    ),
  ],
);
