/**
 * Drizzle `notifications` OLTP stub (ADR-090 / ARD-014).
 *
 * In-app notification rows; merchant-scoped; read_at nullability.
 * Migrations via Drizzle Kit → ARD-014.
 */

import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey(),
    merchantId: uuid("merchant_id").notNull(),
    storeId: uuid("store_id"),
    /** Staff or customer recipient; null = store/merchant broadcast. */
    userId: uuid("user_id"),
    /** merchant | customer */
    audience: varchar("audience", { length: 16 }).notNull(),
    /** in_app | sms (sms rows optional audit of outbound) */
    channel: varchar("channel", { length: 16 }).notNull(),
    /** Stable type key, e.g. order_created */
    type: varchar("type", { length: 64 }).notNull(),
    titleFa: text("title_fa").notNull(),
    bodyFa: text("body_fa").notNull(),
    sourceEventId: uuid("source_event_id"),
    sourceEventType: varchar("source_event_type", { length: 128 }),
    readAt: timestamp("read_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("notifications_merchant_id_user_id_created_at_idx").on(
      t.merchantId,
      t.userId,
      t.createdAt,
    ),
    index("notifications_merchant_id_created_at_idx").on(
      t.merchantId,
      t.createdAt,
    ),
    /** Unread partial index intent — Drizzle Kit may encode via SQL later. */
    index("notifications_merchant_id_unread_created_at_idx").on(
      t.merchantId,
      t.createdAt,
    ),
    uniqueIndex("notifications_source_event_id_channel_uq").on(
      t.sourceEventId,
      t.channel,
    ),
  ],
);
