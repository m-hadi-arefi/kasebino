/**
 * Store membership OLTP table (ADR-007 / ARD-031) — Drizzle schema stub.
 *
 * Aligns with `src/database-modeling` (ADR-043) + multi-tenant isolation (ADR-048):
 * - UUID PKs, snake_case plural tables
 * - UTC timestamptz audit columns + soft-delete
 * - merchant_id + store_id mandatory (store-owned membership)
 * - Unique (store_id, phone_national) while deleted_at IS NULL (partial index)
 * - Consent surface/version for ADR-091 audit trail
 * - Iranian phone national `09…` + E.164 stored as varchar
 *
 * Migrations via Drizzle Kit → `src/infrastructure/database/migrations/` (ARD-031).
 */

import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const storeMemberships = pgTable(
  "store_memberships",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    /** Iranian national mobile: 09xxxxxxxxx */
    phoneNational: varchar("phone_national", { length: 11 }).notNull(),
    /** E.164: +989xxxxxxxxx */
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    /** pos | qr | storefront | pickup */
    source: varchar("source", { length: 32 }).notNull(),
    /** active | suspended | inactive */
    status: varchar("status", { length: 32 }).notNull(),
    /** pos_notice_continue | digital_checkbox */
    consentSurface: varchar("consent_surface", { length: 64 }).notNull(),
    consentVersion: varchar("consent_version", { length: 64 }).notNull(),
    consentedAt: timestamp("consented_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    joinedAt: timestamp("joined_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
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
    /** Optional CRM notes (Persian UTF-8) — UI later. */
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("store_memberships_store_id_phone_national_active_uq")
      .on(t.storeId, t.phoneNational)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("store_memberships_store_id_customer_id_active_uq")
      .on(t.storeId, t.customerId)
      .where(sql`${t.deletedAt} is null`),
    index("store_memberships_merchant_id_store_id_idx").on(
      t.merchantId,
      t.storeId,
    ),
    index("store_memberships_store_id_joined_at_idx").on(t.storeId, t.joinedAt),
    index("store_memberships_customer_id_idx").on(t.customerId),
    index("store_memberships_merchant_id_idx").on(t.merchantId),
  ],
);
