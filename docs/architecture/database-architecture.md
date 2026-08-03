# Database Architecture

**Tier-0 requirement.** Persistence is designed by a Senior Database Architect mindset, not CRUD convenience. ORM follows this document — Drizzle encodes the design; it does not invent it.

## Stack

| Layer | Technology |
| --- | --- |
| RDBMS | PostgreSQL (latest stable) |
| ORM | **Drizzle ORM only** |
| Migrations | Drizzle Kit (versioned SQL) |
| Cache | Redis (cache-aside in front of hot reads) |
| Objects | MinIO (not in PG) |

## Capacity targets (design envelope)

Schema and indexes must support without major redesign:

| Dimension | Target |
| --- | --- |
| Merchants | 50,000+ |
| Customers | 5,000,000+ |
| Transactions (sales + orders) | 50,000,000+ |

## Isolation model

Shared database, shared schema, **row-level tenant discriminator** `merchant_id` (UUID).

- Nearly all business tables include `merchant_id NOT NULL`
- Unique constraints are tenant-scoped: `(merchant_id, …)`
- Every repository query filters `merchant_id` from trusted auth context
- Platform admin tables are global and role-gated

Store isolation: where multi-store exists, `store_id` is additional scope for inventory, sales, and some analytics — still always under `merchant_id`.

## Layering

```
Domain          → pure aggregates, repository interfaces
Application     → use cases, transaction boundaries (ports)
Infrastructure  → Drizzle schema, migrations, repository impls, db client
```

## Logical schemas (bounded-context table groups)

| Context | Core tables |
| --- | --- |
| Identity | `auth_users`, `otp_challenges` |
| Merchant | `merchants`, `merchant_settings` |
| Store | `stores` |
| Catalog | `categories`, `products` |
| Inventory | `stock_items` |
| POS/Sales | `sales`, `sale_lines` |
| CRM | `customers` |
| Loyalty | `point_rules`, `wallets`, `points_ledger`, `coupons` |
| Ordering | `orders`, `order_lines` |
| Payments | `payments` |
| Analytics | `analytics_*` projection tables |
| Platform | `audit_logs`, `outbox_events`, `processed_events` |
| Notifications | `notifications` |

## Universal column standards

| Column | Rule |
| --- | --- |
| `id` | UUID PK, generated in DB or app |
| `merchant_id` | Required on tenant tables |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz NOT NULL`, maintained on write |
| `deleted_at` | Soft delete when entity is customer-visible or auditable |
| `version` | Optimistic locking where concurrent writers exist |

## Growth model (order-of-magnitude)

Assumptions for planning (adjust via ADR if GTM differs):

| Merchants | Customers (~100/merchant avg early; rises) | Sales (~500/merchant/year early) |
| --- | --- | --- |
| 10 | ~1K–10K | ~5K–50K |
| 500 | ~50K–500K | ~250K–2.5M |
| 5,000 | ~500K–5M | ~2.5M–25M |
| 50,000 | ~5M–50M | ~25M–250M |

Design indexes and partitioning *triggers* for the 50k merchant envelope even if MVP deploys smaller.

## Hot vs cold paths

| Hot | Cold |
| --- | --- |
| Barcode → product, phone → customer, CompleteSale TX, stock decrement | Historical sale detail pages, old campaigns, deep date-range exports |
| Dashboard last-24h/7d aggregates (cached 60s) | Ad-hoc admin scans |

Hot paths must be index-covered and cache-eligible. Cold paths must not force wide indexes that slow writes.

## Partitioning strategy (planned, not mandatory day-1)

| Table family | Strategy when threshold hit |
| --- | --- |
| `sales` / `sale_lines` | RANGE on `created_at` (monthly/quarterly) or HASH `merchant_id` after review |
| `orders` / `order_lines` | Same as sales |
| `points_ledger` | RANGE on `created_at` |
| `audit_logs` / `outbox_events` | RANGE + retention job |

MVP: single-table with strong indexes; document partition cutover in ADR before 10M+ row tables.

## Connection pooling

- One pool per app instance (pg / postgres.js via Drizzle)
- Size ≈ `(max_connections - reserve) / instance_count`
- Ready probe fails if pool cannot acquire
- Long transactions forbidden outside intentional UoW

## Vacuum / analyze

- Autovacuum on; monitor bloat on `sales`, `sale_lines`, `customers`
- `ANALYZE` after large backfills/migrations
- Avoid long idle-in-transaction from app code

## JSONB usage

- Allowed for flexible settings, receipt snapshots, campaign payloads
- Always constrain shape in application Zod
- Index only known query keys (`JSONB` GIN / expression indexes when proven needed)
- Do not put core relational FKs only in JSONB

## Full-text / search

- POS product search: trigram (`pg_trgm`) on `name` / `sku` per merchant **or** Redis/local fuzzy over cached catalog for ≤100ms target
- Prefer exact barcode B-tree for scan path

## Materialized views / projections

- Analytics dashboards use **projection tables** updated from domain events (not live scans of 50M sales)
- Optional materialized views later; event-driven projections preferred for control

## Read-heavy optimization

1. Redis cache-aside (entity TTL 300s, analytics 60s, storefront 600s)
2. Covering indexes for POS lookups
3. Projection tables for AN-* dashboards
4. Replica reads (future) for analytics only — writes stay primary

## Outbox & idempotency tables

| Table | Purpose |
| --- | --- |
| `outbox_events` | Transactional outbox with aggregate write |
| `processed_events` | Consumer idempotency by `event_id` |
| `idempotency_keys` | API Idempotency-Key for sale/order |

## Drizzle placement

- Schema: `src/infrastructure/database/schema/*`
- Migrations: `src/infrastructure/database/migrations/*`
- Client: `src/infrastructure/database/drizzle/client.ts`
- Repositories: infrastructure implementing domain ports

## Related

- [indexing-strategy.md](./indexing-strategy.md)
- [query-strategy.md](./query-strategy.md)
- [data-modeling-guidelines.md](./data-modeling-guidelines.md)
- [docs/tech/drizzle-orm.md](../tech/drizzle-orm.md)
