/**
 * Admin OLTP tables (ADR-013 / ARD-018) — Drizzle schema stub.
 *
 * `admin_users` — platform operators (not merchant staff).
 * `admin_actions` — enforcement trail (evidence also via AuditPort → mos_audit).
 *
 * Migrations via Drizzle Kit → `src/infrastructure/database/migrations/` (ARD-018).
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

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey(),
    login: varchar("login", { length: 256 }).notNull(),
    /** Persian-capable display name. */
    displayName: text("display_name").notNull(),
    /** active | disabled */
    status: varchar("status", { length: 32 }).notNull(),
    /** Always platform_admin for MVP. */
    role: varchar("role", { length: 64 }).notNull(),
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
    uniqueIndex("admin_users_login_uq").on(t.login),
    index("admin_users_status_idx").on(t.status),
  ],
);

export const adminActions = pgTable(
  "admin_actions",
  {
    id: uuid("id").primaryKey(),
    adminUserId: uuid("admin_user_id").notNull(),
    /** merchant.activate | merchant.suspend | merchant.view | merchant.list */
    action: varchar("action", { length: 64 }).notNull(),
    merchantId: uuid("merchant_id"),
    /** success | denied | failed */
    result: varchar("result", { length: 32 }).notNull(),
    reason: text("reason"),
    /** Persian ops note. */
    reasonFa: text("reason_fa"),
    correlationId: uuid("correlation_id").notNull(),
    beforeStatus: varchar("before_status", { length: 32 }),
    afterStatus: varchar("after_status", { length: 32 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    index("admin_actions_created_at_idx").on(t.createdAt),
    index("admin_actions_merchant_id_created_at_idx").on(
      t.merchantId,
      t.createdAt,
    ),
    index("admin_actions_admin_user_id_idx").on(t.adminUserId),
    index("admin_actions_action_idx").on(t.action),
  ],
);
