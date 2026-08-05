# ADR-101 - Pickup Order Lifecycle Merchant Board

| Field | Value |
| --- | --- |
| ID | ADR-101 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Pickup Order Lifecycle Merchant Board

## Context

Ordering domain models full pickup lifecycle; merchant has no orders board UI/API. Staff cannot prepare, mark ready, or complete pickups.

## Problem Statement

Without a merchant board, online pickup orders cannot be fulfilled in-store - storefront checkout is dead-on-arrival.

## Goals

- Merchant/staff board to view and advance pickup statuses per ADR-082/091.
- Support: paid → preparing → ready_for_pickup → picked_up → completed; cancel/refund actions.
- Realtime or polling updates for new orders.

## Non Goals

- Delivery status columns.
- Automatic refunds to PSP without explicit staff action (manual refund decision per ADR-091).

## Functional Requirements

- FR-1: List open pickup orders for active store, grouped/filterable by status.
- FR-2: Transition actions with invalid-transition errors surfaced in Persian.
- FR-3: Ready hold expiry signals (24h) visible; unpaid cancellations reflected when job runs (ADR-109).
- FR-4: Optional MQTT/poll refresh (ADR-124).

## Technical Design

1. Merchant route `/orders` (or `/pickup`) Persian RTL kanban/list.
2. APIs wrap ordering use cases (`startPreparing`, `markReady`, `markPickedUp`, `complete`, `cancel`, `refund`).
3. uiuxpromax + status chips from ADR-114.

## Database Changes

- Uses `orders` / `order_lines` via ADR-093.

## Backend Changes

- Wire order repository + lifecycle APIs; authZ store scope.

## Frontend Changes

- Lifecycle board UI with action buttons and empty states.

## Admin Changes

- None.

## API Changes

- `/api/v1/orders` list/get
- `/api/v1/orders/{id}/transitions/*` (or PATCH status with allowed events)

## Security Considerations

- Staff permissions; deny cross-store order access.
- Refund action audited.

## Edge Cases

- Double transition clicks / concurrency.
- Transition after auto-cancel.
- Refund after cancelled.

## Acceptance Criteria

- [ ] Staff can advance a paid order to ready_for_pickup and completed.
- [ ] Illegal transitions rejected with clear Persian error.
- [ ] New storefront order appears on board (poll or realtime).
- [ ] Cancel + manual refund path available where policy allows.

## Rollout Plan

Ship with ADR-100 checkout; timers via ADR-109.

## Dependencies

- ADR-011, ADR-082, ADR-091, ADR-093, ADR-094, ADR-095, ADR-100, ADR-109, ADR-114

## Risks

- Staff missing ready orders without realtime - poll fallback mandatory.

## Related Documents

- `PRD.md` ORD-*
- ADR-091 pickup timers

## Iranian User Experience Requirements

- Persian status labels; RTL board; Jalali timestamps; تومان totals.
- uiuxpromax before UI.

## Estimated Complexity

**M**
