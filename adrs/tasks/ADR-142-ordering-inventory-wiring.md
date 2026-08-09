# ADR-142: Ordering ↔ Inventory Reserve/Release Wiring

| Field | Value |
| --- | --- |
| ID | ADR-142 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` (2026-08-09) Critical #1 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

Online pickup orders mark paid and proceed through merchant boards, but production composition does **not** inject inventory ports. Defaults are no-op stubs. POS decrements stock; storefront does not — overselling risk.

## Current State

- Stubs: `src/modules/ordering/application/ports.ts` (`createStubInventoryReservePort` / `Release`)
- Defaults wired in: `src/modules/ordering/application/use-cases.ts` (~L117–119)
- Composition: `src/infrastructure/composition/create-api-context.ts` creates ordering with `paymentConfirm` only (~L412–418) — **no** `inventoryReserve`/`inventoryRelease`
- Real UCs already exist: `decrementForPickupPaid` / `restorePickupStock` in `src/modules/inventory/application/use-cases.ts` (+ unit tests)
- Schema: `stock_items`, `stock_movements` — no reservations table (`reservationsTableMvp: false` pattern)

## Decision

Wire production adapters from inventory use-cases into ordering; run reserve/decrement inside the same DB transaction as `markPaid` when `txScope` is present; restore on cancel/refund after paid; fail closed if stubs are used when `MOS_ENV=production`.

## Scope

Included:

- Composition wiring + inventory adapters
- Same-TX markPaid decrement (or reserve-then-finalize if already modeled)
- Restore on cancel/refund paths already calling release ports
- Integration tests + production guard

Excluded:

- Multi-warehouse
- Soft/allow-negative stock
- Delivery inventory
- ERP Stock Entry policy changes (ADR-137/140)

## Technical Design

### Database

- No new tables for MVP — decrement on paid (existing UC semantics).
- Append `stock_movements` with order reference on decrement/restore.

### Backend

1. `createInventoryReserveAdapter(inventory)` / `createInventoryReleaseAdapter(inventory)` in inventory or ordering infrastructure.
2. Pass into `createOrderingUseCases` from `create-api-context` / `createAppContext`.
3. Assert `MOS_ENV=production` rejects stub ports (throw at boot).
4. Ensure markPaid UoW includes inventory call when `repos.txScope` available.

### Frontend

- None required beyond existing Persian insufficient-stock errors if any surface already maps inventory errors.

### Security

- Tenant checks already on order/inventory; preserve merchantId/storeId on every call.

## Implementation Plan

1. Implement adapters calling `decrementForPickupPaid` / restore.
2. Wire composition.
3. Add production boot guard.
4. Integration test: create order → pay → stock decreased; cancel → restored.
5. Unit test stubs remain for isolated ordering tests only.

## Data Model Changes

Tables: none  
Fields: none  
Indexes: none  
Relations: logical orderId → stock_movements.reference

## API Changes

Routes: behavior only on existing order pay/cancel/refund  
Request/Response: unchanged shapes; may return inventory insufficiency errors with existing error codes

## Frontend Changes

Pages: none new  
Components: ensure merchant/customer see Persian stock-failure copy if not already  
User flows: paid order consumes stock

## Testing Requirements

Unit: adapter mapping; production guard  
Integration: Postgres markPaid + stock_items delta  
E2E: storefront pay → inventory UI reflects (can follow ADR-117)

## Acceptance Criteria

- [ ] Production composition does not use inventory stubs
- [ ] Paying an order decrements `stock_items` and appends movement
- [ ] Cancel/refund after paid restores stock
- [ ] Insufficient stock fails markPaid without corrupting payment intent state (document policy)
- [ ] `MOS_ENV=production` fails boot if stubs injected
- [ ] Integration test covers happy path + restore

## Dependencies

Required before: inventory `decrementForPickupPaid` (exists)  
Depends on: none blocked  
Blocks: honest storefront inventory MVP, ERPNext dual-run confidence for orders

## Migration / Rollout Plan

1. Ship behind staging first; audit historical paid orders with no stock moves (ops note — no automatic backfill required for pilot unless product insists).
2. Enable production after integration green.
