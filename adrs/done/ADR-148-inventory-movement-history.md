# ADR-148: Inventory Movement History API and Merchant UI

| Field | Value |
| --- | --- |
| ID | ADR-148 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #10 |
| Folder | `adrs/done/` |

## Status

Accepted — Completed on 2026-08-12.

## Context

`stock_movements` ledger was written on adjust/sale paths, but merchants only saw balance + `updatedAt`. No history API/UI was exposed to query stock movements by store/product.

## Current State

- Schema & DB: `stock_movements` composite index `(merchant_id, store_id, created_at desc)`.
- Repository: `listMovements` implemented in `InMemoryStockMovementRepository` and `DrizzleStockMovementRepository` with store, product, cursor, and limit filters.
- Use Case: `listStockMovements` in `src/modules/inventory/application/use-cases.ts`.
- HTTP API: `GET /api/v1/inventory/movements?storeId={storeId}&productId={productId}&cursor={cursor}&limit={limit}` in `src/infrastructure/http/handlers/inventory.ts`.
- DTO & Localization: `stockMovementDto` maps movement reasons to Persian terms (`STOCK_MOVEMENT_REASONS_FA`).

## Decision

1. Added `listMovements` query method to `StockMovementRepository` port and adapters.
2. Exposed `GET /api/v1/inventory/movements` protected by `inventory.read` permission.
3. Persian shop-floor translations for movement reasons (`فروش حضوری`, `اصلاح دستی موجودی`, `ورودی از تامین‌کننده`, etc.).

## Scope

Included:

- Repository query by store/product + createdAt cursor pagination
- `GET /api/v1/inventory/movements`
- Persian reason mappings (`STOCK_MOVEMENT_REASONS_FA`)
- RBAC inventory view permission
- Unit and HTTP integration tests

Excluded:

- Warehouse multi-bin
- ERP valuation reports
- Editing historical movements (immutable)

## Acceptance Criteria Verified

- [x] Merchant can query movements for a product after adjust and after POS sale
- [x] Cross-tenant access denied
- [x] Persian presentation (`STOCK_MOVEMENT_REASONS_FA`)
- [x] Pagination cursor stable
