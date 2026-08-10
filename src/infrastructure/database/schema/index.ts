/**
 * Centralized Drizzle schema index (ADR-042 / ADR-043 / ADR-044 / ADR-045 / ADR-046 / ADR-047 / ADR-048).
 *
 * Domain tables land with domain ADRs following `src/database-modeling` (ADR-043).
 * Index declarations follow `src/indexing-standards` (ADR-044). Query patterns follow
 * `src/query-design-standards` (ADR-045). Migrations via Drizzle Kit follow
 * `src/migration-strategy` (ADR-046) — generate into
 * `src/infrastructure/database/migrations/` only; never hand-author baseline SQL.
 * Soft-delete / audit timestamps / version / AuditPort shape follow
 * `src/data-integrity` (ADR-047); Mongo audit adapter →
 * `src/audit-logging/` (ADR-058).
 * Row-level merchant_id isolation (+ store_id for membership/inventory) follow
 * `src/multi-tenant-isolation` (ADR-048); PostgreSQL RLS deferred optional later.
 *
 * Iranian First: Persian UTF-8 product/customer text columns use `text` / `varchar`
 * (never ASCII-only types or collations); money as integer IRR minor units.
 * Timestamps stored UTC; display Asia/Tehran + Jalali in presentation.
 * Soft-delete and audit summaries preserve fa UTF-8 content.
 * Store-first Iranian multi-store scopes membership/inventory per store under merchant.
 * Barcode / fuzzy Persian search indexes → ADR-050.
 *
 * ADR-005: `merchants` + `merchant_settings` stubs (migrations → ARD-003).
 * ADR-006: `stores` stub (migrations → ARD-004).
 * ADR-007: `store_memberships` stub (migrations → ARD-031).
 * ADR-008: `categories` + `products` + `stock_items` stubs (migrations → ARD-005/006).
 * ADR-009: `sales` + `sale_lines` stubs (migrations → ARD-007).
 * ADR-010: `point_rules` + `wallets` + `points_ledger` + `coupons` stubs (migrations → ARD-009).
 * ADR-011: `orders` + `order_lines` stubs (migrations → ARD-011).
 * ADR-012: `payments` stub (migrations → ARD-012).
 * ADR-013: `admin_users` + `admin_actions` stubs (migrations → ARD-018).
 * ADR-035: `outbox_events` + `processed_events` stubs (migrations → ARD-001).
 * ADR-109: `outbox_dead_letters` durable DLQ after max retries.
 * ADR-090: `notifications` stub (migrations → ARD-014).
 * ADR-092: identity tables (`auth_users`, OTP challenges, `customer_identities`) + baseline Kit migration.
 * ADR-106: analytics projection tables for merchant AN-01..04 dashboards.
 * ADR-126: external_entity_mappings + stock_movements + product UOM foundation.
 * ADR-141: erpnext_sync_records lifecycle for finance sync status.
 */

export { merchantSettings, merchants } from "./merchants.js";
export { stores } from "./stores.js";
export { storeMemberships } from "./memberships.js";
export { categories, products } from "./catalog.js";
export { stockItems, stockMovements } from "./inventory.js";
export { saleLines, sales } from "./sales.js";
export { coupons, pointRules, pointsLedger, wallets } from "./loyalty.js";
export { orderLines, orders } from "./orders.js";
export { payments } from "./payments.js";
export { notifications } from "./notifications.js";
export { adminActions, adminUsers } from "./admin.js";
export {
  outboxDeadLetters,
  outboxEvents,
  processedEvents,
} from "./platform.js";
export { externalEntityMappings, erpnextSyncRecords } from "./integrations.js";
export {
  authUsers,
  customerIdentities,
  customerOtpChallenges,
  merchantOtpChallenges,
  staffMemberships,
  staffStoreScopes,
} from "./identity.js";
export {
  analyticsCustomerStats,
  analyticsDailyRevenue,
  analyticsProjectionEvents,
  analyticsRetentionStats,
} from "./analytics.js";