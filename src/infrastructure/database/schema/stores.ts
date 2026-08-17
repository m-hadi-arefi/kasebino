/**
 * Store OLTP table (ADR-006 / ARD-004) — Drizzle schema stub.
 *
 * Aligns with `src/infrastructure/database/contracts/modeling` (ADR-043) + multi-tenant isolation (ADR-048):
 * - UUID PKs, snake_case plural tables
 * - UTC timestamptz audit columns + optional soft-delete
 * - merchant_id mandatory (tenant-owned)
 * - Persian UTF-8 `text` / `varchar` for names and address
 * - Globally unique slug for `/s/{slug}` (ADR-091)
 * - Structured address + lat/lng (static map policy)
 *
 * Migrations via Drizzle Kit → `src/infrastructure/database/migrations/` (ARD-004).
 */

import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    /** Globally unique storefront slug — `/s/{slug}`. */
    slug: varchar("slug", { length: 64 }).notNull(),
    /** Persian storefront display name — UTF-8 text. */
    displayName: text("display_name").notNull(),
    logoObjectKey: varchar("logo_object_key", { length: 512 }),
    primaryColor: varchar("primary_color", { length: 16 }),
    /** draft | active | inactive */
    status: varchar("status", { length: 32 }).notNull(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    province: text("province").notNull(),
    postalCode: varchar("postal_code", { length: 20 }),
    displayAddress: text("display_address").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    /** Weekly hours JSON stub (Asia/Tehran intent). */
    hoursJson: text("hours_json").notNull(),
    /** QR asset ref — generation → ARD-033. */
    qrAssetRef: varchar("qr_asset_ref", { length: 512 }),
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
    uniqueIndex("stores_slug_uq").on(t.slug),
    index("stores_merchant_id_idx").on(t.merchantId),
    index("stores_merchant_id_created_at_idx").on(t.merchantId, t.createdAt),
    index("stores_status_idx").on(t.status),
  ],
);
