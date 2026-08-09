# Database status

**Audit date:** 2026-08-09  
**OLTP:** PostgreSQL via Drizzle (`src/infrastructure/database/schema/`)  
**Migrations:** `src/infrastructure/database/migrations/` (`0000`–`0005`)

---

## Tables inventory

| Table | Owner module | Purpose | Completeness |
| --- | --- | --- | --- |
| `merchants` | merchant | Tenant root + `settings_json` | Wired |
| `merchant_settings` | merchant | KV settings | **Underused** — app prefers `merchants.settings_json` |
| `stores` | store | Branding, address, hours_json, slug | Wired; hours not fully HTTP-exposed |
| `store_memberships` | crm | Per-store customer membership | Wired; `notes` column unused in repo |
| `categories` | catalog | Categories | Wired |
| `products` | catalog | SKU/barcode/price/soft-delete | Wired; UOM columns ahead of domain |
| `stock_items` | inventory | Balances + optimistic `version` | Wired |
| `stock_movements` | inventory | Append-only ledger | Wired write; weak read UX |
| `sales` / `sale_lines` | pos | Completed sales, tender, receipt keys, idempotency | Wired |
| `point_rules` / `wallets` / `points_ledger` | loyalty | Points engine | Wired |
| `coupons` | loyalty (declared) | Coupon codes | **Orphan** — schema only |
| `orders` / `order_lines` | ordering | Pickup orders + idempotency | Wired |
| `payments` | payments | PaymentIntent | Wired (sandbox gateway) |
| `notifications` | notifications | In-app inbox | Wired |
| `admin_users` / `admin_actions` | admin | Platform admin trail | Wired |
| `outbox_events` / `processed_events` / `outbox_dead_letters` | platform/workers | Transactional outbox | Wired |
| `auth_users` | identity | Merchant staff users | Wired; no invite workflow |
| `merchant_otp_challenges` | identity | OTP challenges (hashed) | Wired |
| `customer_identities` / `customer_otp_challenges` | customer-identity | Customer OTP | Wired |
| `analytics_*` (4 tables) | analytics | OLTP projections for dashboards | Wired |
| `external_entity_mappings` | accounting | External system IDs | Wired |
| `erpnext_sync_records` | erpnext | Sync lifecycle + FA errors | Wired (`0005`) |

**Approx. count:** 37 `pgTable` definitions across schema files.

---

## Migrations

| Migration | Topic | Notes |
| --- | --- | --- |
| `0000` | Baseline | Kit-generated snapshot present |
| `0001`–`0002` | Follow-ons | Snapshots present |
| `0003_receipt_object_keys.sql` | Receipt MinIO keys | Hand-authored; **missing** `meta/0003_snapshot.json` |
| `0004_skinny_mandroid.sql` | mappings + movements + UOM | Snapshot present |
| `0005_erpnext_sync_records.sql` | Sync records | Hand-authored; **missing** `meta/0005_snapshot.json` |

Risk: `drizzle-kit check` / future generate may drift. README says avoid hand-authoring.

---

## Integrity findings

| Finding | Severity | Detail |
| --- | --- | --- |
| **No SQL foreign keys** | High (ops) | Zero `REFERENCES` in migrations; integrity is application-only |
| **No PostgreSQL RLS** | Medium | Explicitly deferred (ADR-048); tenant bugs = app bugs |
| **Orphan `coupons`** | Low | Dead table until loyalty coupon ADR implemented |
| **Status as varchar** | Medium | No DB CHECK enums for order/payment/sale status |
| **Indexes** | Mostly OK | Hot paths: merchant/store, barcode/sku unique (partial soft-delete patterns in comments), idempotency uniques |
| **Money** | OK | Integer IRR minor units (Iranian First) |
| **UTF-8 Persian text** | OK | `text`/`varchar`; roundtrip integration test exists |

---

## Risky relationships (logical, not FK)

- Sale lines → products: app enforces; deleted products rely on soft-delete policy.
- Orders pay path does **not** decrement `stock_items` in production wiring (stub ports) — logical inconsistency risk vs POS which does.
- `external_entity_mappings` / `erpnext_sync_records` orphaned from ERP if provider=noop — expected.

---

## Analytics vs OLTP

Mongo collections (warehouse/audit/clickstream) are **not** in this Drizzle schema. Do not treat Mongo as transactional SoT.
