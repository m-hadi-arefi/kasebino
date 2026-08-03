# ARD-035 — Customer Dashboard

| Field | Value |
| --- | --- |
| ID | ARD-035 |
| Title | Customer Dashboard |
| Status | `todo` |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | store-first-evolution.md / ADR-087 |

## Objective

Customer-facing portal (in store PWA/storefront auth area): profile, loyalty points, purchase history, rewards, receipts — always **store-scoped** via active membership.

**ADR-087 foundations landed:** `src/customer-dashboard` contract + `/s/{storeSlug}/dashboard` (+ orders/wallet) Persian stubs. Live APIs, JWT gate, and read models remain.

## Business Value

Closes loyalty and PWA growth loops by making value visible without staff.

## Requirements

- CUST-02, CUST-03
- LYL-04 (customer visibility)
- Receipt access from POS and pickup orders

## Dependencies

- ARD-030, ARD-031
- ARD-009
- ARD-007 receipts / ARD-011 orders
- ARD-029 shell

## Architecture

Customer app routes under store context; TanStack Query; no merchant chrome.
Switch-store UX if multiple memberships (simple list).

## Domain Model

Read models over membership, wallet, sales, orders, receipts.

## API Contracts

| Method | Path |
| --- | --- |
| GET | `/api/v1/customer/me` |
| GET | `/api/v1/customer/stores/:storeId/wallet` |
| GET | `/api/v1/customer/stores/:storeId/history` |
| GET | `/api/v1/customer/stores/:storeId/rewards` |
| GET | `/api/v1/customer/stores/:storeId/receipts/:id` |

## Events

- `LoyaltyWalletViewed`, `ReceiptViewed` (product analytics)

## Persistence Strategy

### PostgreSQL + Drizzle

Read-only queries with membership authZ filters.

### Caching

Wallet/history cache TTL 60–300s; invalidate on points/sale/order events.

## Analytics / Audit / Tracking Requirements

- Analytics: portal engagement
- Audit: N/A
- Tracking: tab views
- Metrics: WAU customers per store

## UI Requirements

- **uiuxpromax REQUIRED**

## Acceptance Criteria

- [ ] Authenticated member sees points, history, rewards, receipts for that store only
- [ ] Cross-store leakage tests pass
- [ ] Works in store PWA
- [ ] Empty states for new members

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
- Reports: Persian labels + Jalali/`Asia/Tehran` buckets for humans.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.
- Customer journeys assume phone OTP + store visit.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + loyalty/PWA growth loop alignment.

## Implementation Checklist

- [x] Architecture contract + Persian RTL route stubs (ADR-087)
- [ ] APIs + authZ tests (live handlers)
- [x] uiuxpromax screens (dashboard / orders / wallet stubs)
- [ ] Cache invalidation hooks
- [ ] STATUS

## Completion Protocol

Update STATUS + progress-log.
