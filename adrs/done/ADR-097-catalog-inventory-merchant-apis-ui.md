# ADR-097 - Catalog and Inventory Merchant Management

| Field | Value |
| --- | --- |
| ID | ADR-097 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Catalog and Inventory Merchant Management

## Context

Catalog/inventory domain + schemas exist; no merchant product management UI or APIs. Storefront catalog and POS cannot operate without products/stock.

## Problem Statement

Without CRUD for categories/products and stock adjustments, POS and storefront remain empty shells.

## Goals

- Merchant can create/update/soft-delete categories and products, assign barcodes, adjust stock.
- Emit `Product*` / `Inventory*` events; invalidate storefront/POS caches.
- Persian UTF-8 search considerations for product names.

## Non Goals

- Multi-warehouse ERP purchasing.
- Supplier networks.
- Advanced AI recommendations.

## Functional Requirements

- FR-1: Product create/update/soft-delete per store.
- FR-2: Barcode uniqueness per store.
- FR-3: Stock adjust transactional with `InventoryChanged` (low/out events when thresholds met).
- FR-4: Persian-capable name search for merchant UI.
- FR-5: Prices displayed/edited in تومان (IRR integers).

## Technical Design

1. Merchant routes under `(merchant)` e.g. `/products`, `/inventory`.
2. APIs calling catalog/inventory use cases via ADR-094.
3. Cache-aside invalidation on mutations (ADR-108 / ADR-054).
4. uiuxpromax + ADR-114 form controls.

## Database Changes

- Uses `categories`, `products`, `stock_items` via ADR-093.

## Backend Changes

- Wire catalog/inventory Drizzle repos; APIs; event outbox writes.

## Frontend Changes

- Persian RTL product list/detail forms, barcode field, stock adjust UI.

## Admin Changes

- None.

## API Changes

- `/api/v1/catalog/categories`, `/api/v1/catalog/products`
- `/api/v1/inventory/stock-items` adjust/get

## Security Considerations

- Merchant staff permissions; store-scoped queries.
- Soft-delete only (no hard delete in MVP UI).

## Edge Cases

- Duplicate barcode.
- Negative stock prevention rules.
- Soft-deleted product still referenced by historical sales (read-only history OK).

## Acceptance Criteria

- [ ] Merchant can add product with barcode and stock for active store.
- [ ] POS lookup finds product by barcode.
- [ ] Storefront catalog lists active products for slug.
- [ ] Soft-deleted products excluded from default lists.

## Rollout Plan

Land before POS (ADR-096) and storefront (ADR-100) go-live demos.

## Dependencies

- ADR-008, ADR-049, ADR-050, ADR-093, ADR-094, ADR-095, ADR-108, ADR-114

## Risks

- Cache staleness showing wrong price/stock at POS.

## Related Documents

- `PRD.md` M1
- ADR-050 search/barcode

## Iranian User Experience Requirements

- Persian product names; RTL forms; تومان prices.
- uiuxpromax before UI.

## Estimated Complexity

**L**
