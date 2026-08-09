/**
 * Integration OLTP tables (ADR-126 / ADR-141) — vendor-neutral mappings + ERPNext sync lifecycle.
 *
 * Maps MerchantOS entity UUIDs to external provider ids.
 * Never store ERPNext-specific columns on retail domain tables.
 */

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const externalEntityMappings = pgTable(
  "external_entity_mappings",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id"),
    /** e.g. product | customer | store_warehouse | merchant | sale | payment | order */
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    /** e.g. noop | fake | erpnext — never couple schema to one vendor default */
    provider: varchar("provider", { length: 64 }).notNull(),
    externalId: varchar("external_id", { length: 191 }).notNull(),
    /** Optional second external key (rare); prefer separate entity_type rows */
    externalSecondaryId: varchar("external_secondary_id", { length: 191 }),
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
    uniqueIndex("external_entity_mappings_internal_uq").on(
      t.merchantId,
      t.provider,
      t.entityType,
      t.entityId,
    ),
    uniqueIndex("external_entity_mappings_external_uq").on(
      t.merchantId,
      t.provider,
      t.entityType,
      t.externalId,
    ),
    index("external_entity_mappings_merchant_id_idx").on(t.merchantId),
    index("external_entity_mappings_provider_entity_type_idx").on(
      t.provider,
      t.entityType,
    ),
  ],
);

/** ADR-141 — outbound ERPNext sync lifecycle (status + Persian error). */
export const erpnextSyncRecords = pgTable(
  "erpnext_sync_records",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id"),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    eventId: varchar("event_id", { length: 128 }),
    erpnextType: varchar("erpnext_type", { length: 64 }),
    erpnextId: varchar("erpnext_id", { length: 191 }),
    status: varchar("status", { length: 32 }).notNull(),
    lastSyncAt: timestamp("last_sync_at", {
      withTimezone: true,
      mode: "date",
    }),
    errorMessageFa: text("error_message_fa"),
    attemptCount: integer("attempt_count").notNull().default(0),
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
    uniqueIndex("erpnext_sync_records_internal_uq").on(
      t.merchantId,
      t.entityType,
      t.entityId,
    ),
    index("erpnext_sync_records_merchant_status_idx").on(
      t.merchantId,
      t.status,
    ),
    index("erpnext_sync_records_merchant_updated_idx").on(
      t.merchantId,
      t.updatedAt,
    ),
  ],
);
