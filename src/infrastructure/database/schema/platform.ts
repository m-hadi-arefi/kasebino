/**
 * Platform OLTP tables (ADR-035 / ARD-001) — Drizzle schema stubs.
 *
 * `outbox_events` + `processed_events` back the transactional outbox worker.
 * Aligns with ADR-036 OUTBOX_EVENT_ROW / PROCESSED_EVENTS.
 *
 * Migrations via Drizzle Kit → `src/infrastructure/database/migrations/` (ARD-001).
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

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey(),
    eventId: uuid("event_id").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id"),
    aggregateId: uuid("aggregate_id"),
    aggregateType: varchar("aggregate_type", { length: 64 }),
    /** Canonical envelope JSON (UTF-8; may include Persian in nested display fields). */
    payloadJson: text("payload_json").notNull(),
    payloadVersion: integer("payload_version").notNull().default(1),
    correlationId: uuid("correlation_id").notNull(),
    causationId: uuid("causation_id"),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date",
    }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
  },
  (t) => [
    uniqueIndex("outbox_events_event_id_uq").on(t.eventId),
    index("outbox_events_merchant_id_idx").on(t.merchantId),
    /** Partial pending poll index implemented in migration SQL (published_at IS NULL). */
    index("outbox_events_published_at_idx").on(t.publishedAt),
    index("outbox_events_created_at_idx").on(t.createdAt),
  ],
);

export const processedEvents = pgTable(
  "processed_events",
  {
    id: uuid("id").primaryKey(),
    eventId: uuid("event_id").notNull(),
    /** Outbox consumer name, e.g. cache_invalidation. */
    consumer: varchar("consumer", { length: 64 }).notNull(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("processed_events_consumer_event_id_uq").on(
      t.consumer,
      t.eventId,
    ),
  ],
);
