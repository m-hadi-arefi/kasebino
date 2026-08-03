# ARD-034 — Pickup Order Flow

| Field | Value |
| --- | --- |
| ID | ARD-034 |
| Title | Pickup Order Flow |
| Status | `todo` |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | store-first-evolution.md |

## Objective

Redesign customer checkout and merchant fulfillment UX/APIs around **in-store pickup only**, implementing the full pickup lifecycle statuses and notifications hooks. Complements ARD-011 domain APIs.

## Business Value

Online demand without delivery complexity; drives foot traffic to owned stores.

## Requirements

- ORD-10, ORD-11, ORD-12
- SF-03
- Explicit non-support: delivery/courier/shipping

## Dependencies

- ARD-010, ARD-011, ARD-012
- ARD-030, ARD-031
- ARD-032 location on checkout
- ARD-015 realtime status
- ARD-009 loyalty earn on paid order

## Architecture

`pickup-order-architecture.md`. Checkout UI fixed fulfillment=pickup; show store map/nav; staff board for Preparing / Ready / Picked Up.

## Domain Model

Order status machine as specified; FulfillmentType=pickup.

## API Contracts

Staff transitions:

| Method | Path |
| --- | --- |
| POST | `/api/v1/orders/:id/preparing` |
| POST | `/api/v1/orders/:id/ready` |
| POST | `/api/v1/orders/:id/picked-up` |
| POST | `/api/v1/orders/:id/complete` |
| POST | `/api/v1/orders/:id/cancel` |
| POST | `/api/v1/orders/:id/refund` |

Customer: create pickup checkout (ARD-011).

## Events

- `OrderPreparing`, `OrderReadyForPickup`, `OrderPickedUp`, `OrderCompleted`, `OrderRefunded`
- Plus OrderCreated/Paid/Canceled

## Persistence Strategy

### PostgreSQL + Drizzle

Order.status enum expanded; no shipping tables.

## Analytics / Audit / Tracking Requirements

- Analytics: pickup funnel conversion + time-to-ready
- Audit: refunds/cancels
- Tracking: checkout steps
- Metrics: pickup completion rate

## UI Requirements

- **uiuxpromax REQUIRED** for customer checkout + merchant pickup board

## Acceptance Criteria

- [ ] No delivery option in UI or API
- [ ] Full status lifecycle works end-to-end
- [ ] Customer notified path exists (realtime/in-app minimum)
- [ ] Map/nav visible at checkout
- [ ] Loyalty earn on paid pickup

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.
- Storefront SEO metadata Persian when applicable.

## RTL Requirements

- Implement RTL-first (`dir=rtl`, logical CSS).
- Mirror directional icons/navigation.
- No LTR-only layouts for in-scope screens.

## Persian UX Requirements

- Persian typography; strings must not clip or overflow.
- Plain-language errors for traditional merchants.
- Jalali dates + تومان formatting wherever shown.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.
- Customer journeys assume phone OTP + store visit.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + pickup architecture.

## Implementation Checklist

- [x] Pickup-only MVP decision foundations (ADR-082 — `src/pickup-only`; no delivery capability/routes)
- [ ] Status transitions + tests
- [ ] uiuxpromax flows
- [ ] Inventory policy documented & implemented
- [ ] STATUS

## Completion Protocol

Update STATUS + progress-log.
