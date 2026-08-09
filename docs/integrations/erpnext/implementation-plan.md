# ERPNext Preparation — Implementation Plan

ADR: [ADR-126](../../../adrs/done/ADR-126-erpnext-integration-boundaries.md)  
Date: 2026-08-09

## 1. Current architecture findings

- Modular monolith (`src/modules/*`) + composition root (`create-api-context.ts`).
- CompleteSale orchestrates membership → inventory → loyalty → sale → outbox **without one shared DB transaction** (implementation gap vs ADR-009/049 contracts).
- Outbox (`outbox_events` + `processed_events` + DLQ) is the integration spine; consumers: cache, EMQX, warehouse, notifications, MinIO receipts.
- Inventory: `stock_items` current balance only; no OLTP movement ledger (unlike loyalty `points_ledger`).
- Quantities: integers end-to-end; no UOM/weight.
- Payments: `PaymentGateway` port + sandbox — template for accounting port.
- Offline POS: `syncKey` = Idempotency-Key; statuses queued/syncing/synced/rejected/failed. No terminal_id/sequence.
- No `external_entity_mappings`; no ERPNext packages.
- Supplier/purchase: out of MVP / forbidden as in-product supplier network.

## 2. Existing components reused

- PostgreSQL + Drizzle Kit migrations
- Transactional outbox + worker + DLQ + `processed_events`
- `PaymentGateway` / SMS port patterns
- Domain events + ADR-037 catalog
- POS idempotency keys / offline `syncKey`
- Composition root DI

## 3. Components that must change

- CompleteSale composition → single Drizzle UnitOfWork
- Inventory mutations → also append `stock_movements`
- `OUTBOX_CONSUMERS` + worker runtime → `accounting_integration`
- Product schema → base unit foundation columns
- Event catalog stubs for future return/purchase (no business logic)

## 4. New components

- Docs: `docs/integrations/erpnext/*`
- `src/modules/accounting/` (port, mappers, Noop/Fake)
- `src/shared/quantity/`
- Schema: `external_entity_mappings`, `stock_movements`
- Observability metric names for integration processing

## 5. Database migrations

- `external_entity_mappings`
- `stock_movements`
- `products.base_unit_code` (default `piece`)
- `products.quantity_scale` (default `0`)

## 6. New domain abstractions

- `UnitOfMeasure`, scaled `Quantity`, conversion helpers
- `StockMovement` ledger entry
- `ExternalEntityMapping`
- `AccountingProvider` port

## 7. New / consumed events

Consumed by accounting (prefer existing):

| Event | Use |
| --- | --- |
| `SaleCompleted` | Primary recordSale |
| `OrderPaid` | Online fulfillment / sales projection |
| `PaymentSucceeded` | recordPayment |
| `ProductCreated` / `ProductUpdated` | syncProduct |
| `CustomerCreated` | syncCustomer |
| `StockAdjusted` | recordInventoryAdjustment |

Catalog stubs (unimplemented domains): `SaleReturned`, `PurchaseCompleted`.

## 8. Integration boundaries

```text
Domain TX → Outbox → Worker → AccountingProvider → (future ERPNext)
```

Mapping via `external_entity_mappings` keyed by `provider` (e.g. `erpnext` later, `fake` in tests).

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| CompleteSale UoW refactor breaks POS | Keep success behavior identical; expand rollback tests |
| Orphaned outbox on idempotent replay | Re-enqueue SaleCompleted if missing |
| Weight products incomplete | Foundation only; piece path unchanged |
| Over-coupling to ERPNext Doctypes | Port language stays MerchantOS |

## 10. Testing strategy

- Unit: UOM, FakeAccountingProvider idempotency, mappers, movement append
- Module: CompleteSale TX rollback/success with in-memory UoW or repository spies
- Offline: duplicate syncKey
- Guard: no `erpnext` imports under `src/modules/**` domain/application (except future ACL folder name)

## 11. Migration strategy

Expand/contract defaults; empty mappings/movements at deploy; `MOS_ACCOUNTING_PROVIDER=noop`.
