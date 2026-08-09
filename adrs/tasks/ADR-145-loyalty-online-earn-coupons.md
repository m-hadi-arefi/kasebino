# ADR-145: Loyalty Online Earn and Coupons Decision

| Field | Value |
| --- | --- |
| ID | ADR-145 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` High #6 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

POS sales earn loyalty points (wired). Online orders have `earnPointsForOrder` implemented but **never called**. `coupons` table is an orphan schema stub — dead OLTP surface.

## Current State

- Earn POS: `createLoyaltyEarnPort` in composition → CompleteSale
- UC: `earnPointsForOrder` in `src/modules/loyalty/application/use-cases.ts` (~L306+)
- Expiry job: worker (`runLoyaltyPointsExpiryJob`)
- Schema orphan: `coupons` in `schema/loyalty.ts` (“domain foundations deferred”)
- Redeem APIs/UI exist for points

## Decision

1. Wire `earnPointsForOrder` on verified `OrderPaid` / markPaid success path (outbox or inline port — prefer outbox consumer or ordering port for consistency with POS).
2. Resolve coupons: **either** implement minimal coupon redeem MVP **or** drop/deprecate table via migration + schema removal (choose one in implementation; default recommendation: **defer coupons product**, drop orphan table to reduce drift).

## Scope

Included:

- Online earn wiring + idempotency by orderId
- Coupons: implement OR remove (document choice in PR)
- Tests for double-earn prevention

Excluded:

- Campaign builder UI
- Personalized offers / ML segments
- Cross-merchant wallets

## Technical Design

### Backend

**Earn:**

- Option A (preferred): loyalty outbox handler on `OrderPaid` / payment succeeded+order paid event.
- Option B: `loyaltyEarn` port on ordering markPaid (mirrors POS).

Must be idempotent with points ledger unique reference.

**Coupons:**

- If remove: migration drop `coupons`; update schema index comments / drizzle-orm-strategy tests expecting table.
- If implement: domain Coupon, CRUD merchant API, redeem at checkout — expands scope significantly (separate follow-up ADR preferred if product insists).

### Frontend

- Customer portal wallet already shows balance — verify online earn appears.
- Merchant loyalty page: note online earn enabled (copy only).

## Implementation Plan

1. Wire earn + unit/integration tests.
2. Product confirm coupons: remove vs build.
3. Apply schema change.
4. Update audit incomplete-items when done.

## Data Model Changes

Tables: drop `coupons` **or** flesh out  
Fields: n/a for earn  
Indexes: ensure ledger unique on `(wallet_id, reference_type, reference_id)` if not present  
Relations: orderId as earn reference

## API Changes

Routes: none required for earn (event-driven)  
If coupons implemented: `/api/v1/loyalty/coupons` — only if choosing implement path

## Frontend Changes

Pages: optional merchant copy  
User flows: paid online order → points increase

## Testing Requirements

Unit: earnPointsForOrder idempotent  
Integration: markPaid → ledger row  
E2E: optional with ADR-117

## Acceptance Criteria

- [ ] Paid pickup order earns points once
- [ ] Replay/webhook double delivery does not double-earn
- [ ] Coupons table either removed or fully implemented with API/UI/tests
- [ ] POS earn behavior unchanged

## Dependencies

Required before: loyalty runtime (ADR-099 done), ordering paid path  
Depends on: ADR-142 preferred so “paid” matches stocked reality  
Blocks: consistent retention loops for digital customers

## Migration / Rollout Plan

1. Deploy earn wiring (safe additive).
2. Coupons drop in expand/contract: stop reads (none) → drop table.
