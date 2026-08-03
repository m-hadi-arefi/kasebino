# Indexing Strategy

**Never rely on ORM-generated indexes alone.** Every index is intentional, tied to a query, and declared in Drizzle schema + SQL migrations.

## Principles

1. Design indexes from query-first list (`query-strategy.md`)
2. Prefer **composite indexes** matching left-prefix filter order: `merchant_id` first on tenant tables
3. Partial indexes for hot subsets (`WHERE deleted_at IS NULL`, `WHERE status = 'open'`)
4. Avoid redundant indexes that duplicate left-prefixes
5. Measure write amplification — each secondary index costs inserts on sales/lines

## Global patterns

| Pattern | Example |
| --- | --- |
| Tenant + natural key | `(merchant_id, barcode)` UNIQUE WHERE deleted_at IS NULL |
| Tenant + time | `(merchant_id, created_at DESC)` |
| Lookup | `(merchant_id, phone)` |
| FK support | Index every FK column used in joins/cascades |

---

## `customers`

| Index | Type | Why / Query | Selectivity | Gain |
| --- | --- | --- | --- | --- |
| PK `(id)` | Primary | Point load profile | High | O(1) by id |
| UNIQUE `(merchant_id, phone)` WHERE deleted_at IS NULL | Unique partial | POS phone capture / CRM by-phone | High per merchant | ≤1s CRM attach |
| `(merchant_id, last_purchase_at DESC)` | Secondary | Segment lapsed/returning lists | Medium | Avoid sort scans |
| `(merchant_id, total_spend DESC)` | Secondary | VIP / spend dashboards | Medium | Top-N without filesort |
| `(merchant_id, created_at DESC)` | Secondary | Newest customers widget | Medium | List pagination |

Note: Prefer `phone` normalized E.164-like storage for equality index efficiency.

## `products`

| Index | Type | Why / Query | Selectivity | Gain |
| --- | --- | --- | --- | --- |
| PK `(id)` | Primary | Detail | High | |
| UNIQUE `(merchant_id, barcode)` WHERE barcode IS NOT NULL AND deleted_at IS NULL | Unique partial | POS barcode ≤1s | Very high | Critical scan path |
| UNIQUE `(merchant_id, sku)` WHERE sku IS NOT NULL AND deleted_at IS NULL | Unique partial | SKU ops | High | |
| `(merchant_id, category_id)` WHERE deleted_at IS NULL | Secondary | Category browse | Medium | Storefront/POS filter |
| `(merchant_id, is_active)` WHERE deleted_at IS NULL | Secondary / partial | Active catalog lists | Low–medium | Smaller active set |
| `(merchant_id, name)` + `pg_trgm` GIN on name (optional) | Search | Fuzzy name search | — | ≤100ms with cache |

## `stock_items`

| Index | Type | Why | Query |
| --- | --- | --- | --- |
| PK `(id)` or composite PK `(store_id, product_id)` | Primary | Identity | |
| UNIQUE `(merchant_id, store_id, product_id)` | Unique | One stock row | Sale decrement |
| `(merchant_id, store_id, quantity)` WHERE quantity <= reorder_level | Partial | Low-stock jobs | InventoryLow |

## `sales`

| Index | Type | Why / Query |
| --- | --- | --- |
| PK `(id)` | Primary | Receipt fetch |
| `(merchant_id, created_at DESC)` | Composite | Recent sales, revenue day ranges |
| `(merchant_id, store_id, created_at DESC)` | Composite | Store POS history |
| `(merchant_id, customer_id, created_at DESC)` | Composite | CRM purchase history |
| `(merchant_id, status, created_at DESC)` | Composite | Filter completed/canceled |
| UNIQUE `(merchant_id, idempotency_key)` WHERE idempotency_key IS NOT NULL | Unique partial | Duplicate submit guard |

## `sale_lines`

| Index | Type | Why |
| --- | --- | --- |
| PK `(id)` | Primary | |
| `(sale_id)` | FK secondary | Load lines for sale |
| `(merchant_id, product_id, created_at DESC)` | Composite | Product sales analytics |

Denormalize `merchant_id` + `created_at` onto lines for partition/index locality if sales volume demands.

## `store_memberships`

| Index | Why |
| --- | --- |
| UNIQUE `(store_id, customer_id)` WHERE deleted_at IS NULL | One membership per store |
| `(merchant_id, store_id, created_at DESC)` | Member lists |
| `(customer_id, status)` | Customer’s stores |
| `(store_id, source, created_at)` | QR vs POS acquisition analytics |

## `orders` (pickup lifecycle)

Prefer status index including pickup states:

`(merchant_id, status, created_at DESC)` covering `pending_payment|paid|preparing|ready_for_pickup|...`

## `order_lines`

| Index | Why |
| --- | --- |
| `(order_id)` | Load lines |
| `(merchant_id, product_id)` | Product demand |

## `wallets` / `points_ledger`

| Index | Why |
| --- | --- |
| UNIQUE `(merchant_id, customer_id)` on wallets | Wallet lookup |
| `(merchant_id, customer_id, created_at DESC)` on ledger | History + idempotent earn by sale_id unique |

## `outbox_events`

| Index | Why |
| --- | --- |
| `(published_at) WHERE published_at IS NULL` | Worker poll |
| `(created_at)` | Retention |

## `otp_challenges`

| Index | Why |
| --- | --- |
| `(phone, created_at DESC)` | Latest challenge |
| Partial expire cleanup on `expires_at` | GC job |

## Covering index examples

- Barcode resolve: INCLUDE (`product_id`, `name`, `price_amount`, `price_currency`, `is_active`) on `(merchant_id, barcode)` when table wide enough to justify
- Phone resolve: INCLUDE (`customer_id`, `segment`) on `(merchant_id, phone)`

## Anti-patterns

- Indexing `merchant_id` alone on huge tables (low selectivity as merchants grow large internally — still OK as composite leftmost)
- Duplicate `(merchant_id, created_at)` and `(created_at)` without need
- Unique on `phone` globally (must be per merchant)
- Skipping partial `deleted_at IS NULL` on uniqueness (blocks re-create after soft delete)

## Review gate

Every ARD Database Design section must list indexes with: purpose, query, selectivity note. No ARD Done without index review.
