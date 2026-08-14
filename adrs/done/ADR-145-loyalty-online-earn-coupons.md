# ADR-145: Loyalty Online Earn and Coupons Decision

| Field | Value |
| --- | --- |
| ID | ADR-145 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` High #6 |
| Folder | `adrs/done/` |

## Status

Accepted — Completed on 2026-08-12.

## Context

POS sales earn loyalty points (wired). Online orders had `earnPointsForOrder` implemented but **never called**. `coupons` table was an orphan schema stub — dead OLTP surface.

## Current State

- Earn POS: `createLoyaltyEarnPort` in composition → CompleteSale
- Online Earn: `earnPointsForOrder` in `src/modules/loyalty/application/use-cases.ts` wired via `createLoyaltyOutboxHandler` handling `OrderPaid` outbox events.
- Idempotency: `findEarnByOrderId` in `PointsLedgerRepository` prevents duplicate points on event retries.
- Schema orphan `coupons` dropped via migration `0007_drop_coupons.sql`.
- Redeem APIs/UI exist for points.

## Decision

1. Wired `earnPointsForOrder` on verified `OrderPaid` outbox handler with `findEarnByOrderId` idempotency check.
2. Dropped orphan `coupons` table and schema definition to clean up unused OLTP stubs.

## Scope

Included:

- Online earn wiring + idempotency by `orderId`
- Dropped orphan `coupons` table
- Tests for double-earn prevention

Excluded:

- Campaign builder UI
- Personalized offers / ML segments
- Cross-merchant wallets

## Implementation

- Implemented `findEarnByOrderId` in `InMemoryPointsLedgerRepository` and `DrizzlePointsLedgerRepository`.
- Updated `earnPointsForOrder` in `use-cases.ts` with `findEarnByOrderId` idempotency check.
- Added `membershipId` and `customerId` to `orderPaidEvent` payload.
- Added `createLoyaltyOutboxHandler` in `src/modules/loyalty/application/outbox-handler.ts` and registered `loyalty_online_earn` in `OUTBOX_CONSUMERS` and `create-outbox-runtime.ts`.
- Removed `coupons` from Drizzle schema and created migration `0007_drop_coupons.sql`.

## Acceptance Criteria Verified

- [x] Paid pickup order earns points once
- [x] Replay/webhook double delivery does not double-earn
- [x] Coupons table removed via migration and schema clean
- [x] POS earn behavior unchanged
