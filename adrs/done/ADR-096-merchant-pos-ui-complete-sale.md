# ADR-096 - Production Merchant POS UI and CompleteSale Workflow

| Field | Value |
| --- | --- |
| ID | ADR-096 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Production Merchant POS UI and CompleteSale Workflow

## Context

PRD POS-01..07 are P0. `/pos` is a Persian shell with offline status/install chrome only. Domain `CompleteSale` exists against in-memory repos; no cart/search/camera UI or sale API.

## Problem Statement

Merchants cannot scan barcodes, capture customer phone, or complete sales during peak hours - blocking the retention flywheel.

## Goals

- Mobile-first Persian RTL POS: barcode/camera/fuzzy search, phone capture → membership, tender, complete <5s, receipt reference.
- Publish `SaleCreated`/`SaleCompleted` via outbox.
- POS consent notice per ADR-091 (continue = consent).

## Non Goals

- Card acquiring inside MerchantOS (record `card_terminal` only).
- Full offline queue end-to-end (ADR-105 / POS-08 P1).
- Loyalty config UI (ADR-099) beyond redeem-at-POS hook.

## Functional Requirements

- FR-1: Barcode resolve ≤1s; fuzzy search ≤100ms p95 cached/local (POS-02/03).
- FR-2: Camera barcode on mobile browsers (POS-04).
- FR-3: Checkout requires Iranian phone; creates/links store membership (POS-05/06, MEM-*).
- FR-4: Tender `cash` | `card_terminal` | `mixed` (ADR-091).
- FR-5: Completed sale generates receipt ref (POS-07); PDF/object storage via ADR-111.
- FR-6: Persian short consent notice visible at phone capture.
- FR-7: Coupon/points redeem entry points when ADR-099 runtime available.

## Technical Design

1. Compose staff PWA page with Zustand cart (ADR-025), TanStack Query lookups (ADR-026), Zod phone schemas (ADR-027).
2. Call `POST /api/v1/pos/sales` (ADR-094) with Idempotency-Key.
3. Barcode miss recovery UX (ADR-028) → create/search product path (ADR-097).
4. uiuxpromax brief before UI implementation (ADR-021).

## Database Changes

- Uses sales/sale_lines + membership via ADR-093.

## Backend Changes

- Ensure CompleteSale use case wired with inventory, membership, optional loyalty earn, outbox, analytics-after-sale isolation (ADR-065/110).

## Frontend Changes

- Full `/pos` cash-register UI: cart, search, camera, phone keypad, tender, success/receipt state.
- تومان line totals; Jalali timestamp on receipt summary.

## Admin Changes

- None.

## API Changes

- `POST /api/v1/pos/sales`
- `GET /api/v1/catalog/products/by-barcode`
- `GET /api/v1/catalog/products/search`

## Security Considerations

- Staff session required; store scope from JWT/active store context.
- Rate-limit POS endpoints reasonably without blocking peak checkout.
- Do not log full OTP or unnecessary PII.

## Edge Cases

- Unmatched barcode.
- Membership soft-deleted phone reuse policy.
- Duplicate Idempotency-Key retry.
- Inventory insufficient at commit.

## Acceptance Criteria

- [ ] Measured barcode → phone → tender → complete path under 5s in local seed data.
- [ ] Sale persists in Postgres and emits outbox event.
- [ ] Phone creates/links membership atomically.
- [ ] Consent notice visible; Persian RTL checklist passes.
- [ ] Unmatched barcode has recovery path.

## Rollout Plan

Depends on catalog products existing (ADR-097) and auth (ADR-095).

## Dependencies

- ADR-009, ADR-050, ADR-093, ADR-094, ADR-095, ADR-097, ADR-098
- ADR-099 (redeem/earn), ADR-111 (receipt object), ADR-114

## Risks

- Camera API variance on Iranian Android WebViews.
- Peak-hour UX friction if phone capture too slow.

## Related Documents

- `PRD.md` POS-*
- `docs/product/user-journeys.md` J2
- ADR-091 tender/consent

## Iranian User Experience Requirements

- Persian + RTL; تومان; Iranian phone keypad.
- uiuxpromax before implementation.
- Obey Iranian First rules and checklist.

## Estimated Complexity

**XL**
