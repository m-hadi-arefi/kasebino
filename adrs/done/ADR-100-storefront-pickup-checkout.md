# ADR-100 - Live Storefront Catalog, Pickup Checkout, and Store Pages

| Field | Value |
| --- | --- |
| ID | ADR-100 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Live Storefront Catalog, Pickup Checkout, and Store Pages

## Context

SF-01..13 and ORD-10..12 are P0. Routes under `/s/[storeSlug]` are Persian shells; catalog empty; pickup CTA is an anchor; no product detail or checkout.

## Problem Statement

Customers cannot browse real products or place pickup-only online orders - store-first acquisition loop fails.

## Goals

- Live branded storefront: catalog, product detail, pickup-only checkout, store about.
- Orders enter `pending_payment` → payment (ADR-102) → merchant board (ADR-101).
- No delivery UI.

## Non Goals

- Delivery/courier/shipping.
- Subdomain storefronts (path `/s/{slug}` only - ADR-091).
- Full PWA offline catalog (online-first; install in ADR-105).

## Functional Requirements

- FR-1: Public catalog + PDP (SF-01/02).
- FR-2: Pickup-only checkout UX (SF-03, ORD-10..12).
- FR-3: Store info page (SF-04); map/nav details owned with ADR-104.
- FR-4: Branding from store settings; cache TTL ~600s for storefront reads.
- FR-5: Realtime notify merchant of new orders (ADR-109/124).

## Technical Design

1. Server components fetch public storefront DTOs.
2. Checkout creates pickup order `pending_payment` + payment intent.
3. Dynamic branding + manifest coordination with ADR-105.
4. uiuxpromax for storefront flows; Persian RTL.

## Database Changes

- Orders/order_lines via ADR-093; reads products/stock.

## Backend Changes

- Public storefront APIs; order create use case wiring; inventory reserve on create/pay per domain ports.

## Frontend Changes

- Replace shells: catalog list, PDP, pickup checkout pages, about page content binding.
- Explicit “تحویل حضوری” only - no delivery option.

## Admin Changes

- None.

## API Changes

- `/api/v1/storefront/{slug}` profile/catalog/product
- `/api/v1/storefront/{slug}/orders` create (customer session as required)

## Security Considerations

- Public ACL on DTOs; no staff/internal fields.
- Customer auth required before commit per policy (OTP login ADR-103).
- Rate-limit checkout create.

## Edge Cases

- Out-of-stock at checkout.
- Unknown/inactive slug → Persian 404.
- Unpaid timeout handled by ADR-109 jobs (30m).

## Acceptance Criteria

- [ ] Visitor opens `/s/{slug}`, browses live catalog, opens PDP.
- [ ] Places pickup order with no delivery option visible.
- [ ] Order appears for merchant lifecycle board.
- [ ] Storefront pages are Persian RTL with تومان prices.

## Rollout Plan

Requires ADR-097 products, ADR-102 payment path (sandbox OK), ADR-104 for map section.

## Dependencies

- ADR-011, ADR-082, ADR-086, ADR-091, ADR-093–095, ADR-097, ADR-102–105, ADR-114

## Risks

- Cache staleness of prices/stock.
- Checkout abandonment without clear unpaid messaging.

## Related Documents

- `PRD.md` SF-*, ORD-*
- `docs/product/user-journeys.md` J4
- `docs/product/store-first-evolution.md`

## Iranian User Experience Requirements

- Persian + RTL; تومان; Jalali ETA/pickup messaging.
- Iranian mobile-first layout.
- uiuxpromax before UI.

## Estimated Complexity

**XL**
