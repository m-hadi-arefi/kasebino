# ARD-031 — Customer Membership Domain

| Field | Value |
| --- | --- |
| ID | ARD-031 |
| Title | Customer Membership Domain |
| Status | `todo` |
| Milestone | M2 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | store-first-evolution.md |

## Objective

Implement first-class **StoreMembership** so each store owns its customer base; unify join via POS, QR/storefront OTP, and pickup checkout.

## Business Value

Foundation for CRM, loyalty scoping, and store-owned retention loops.

## Requirements

- MEM-01, MEM-02
- Integrates CRM-01..04, CUST-02

## Dependencies

- ARD-004
- ARD-003
- ARD-008 (merchant CRM UI consumes memberships)
- ARD-030 for OTP join path
- ARD-007 POS path

## Architecture

See `customer-membership-architecture.md`. Aggregate StoreMembership; sources `pos|qr|storefront|pickup`.

## Domain Model

StoreMembership; repositories; MembershipCreated/Updated events.

## API Contracts

| Method | Path |
| --- | --- |
| POST | `/api/v1/stores/:storeId/memberships/join` |
| GET | `/api/v1/stores/:storeId/memberships/me` |
| GET | `/api/v1/stores/:storeId/members` | merchant |

## Events

- `MembershipCreated`, `MembershipUpdated`

## Persistence Strategy

### PostgreSQL + Drizzle

Table `store_memberships`: unique `(store_id, customer_id)`, `merchant_id`, `source`, `status`, timestamps, soft delete. Indexes for store lists and customer→memberships.

### MongoDB

Warehouse mirror of membership events (ARD-024).

## Database Design

| Merchants | Memberships (order of magnitude) |
| --- | --- |
| 10 | 1K–10K |
| 500 | 50K–500K |
| 50,000 | 5M+ |

### Caching Plan

Membership+wallet keys TTL 300s; invalidate on join/points.

## Analytics / Audit / Tracking Requirements

- Analytics: join funnel by source
- Audit: optional membership suspend
- Tracking: MembershipCreated props.source
- Metrics: new members / QR conversion

## UI Requirements

- Merchant member list via ARD-008 uiuxpromax
- Customer join UX via storefront/PWA uiuxpromax

## Acceptance Criteria

- [ ] POS phone capture creates membership
- [ ] OTP join creates membership with source
- [ ] Store-scoped history/loyalty resolve via membership
- [ ] No cross-store data leak in customer APIs

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

Global DoD + membership architecture + DB gate.

## Implementation Checklist

- [x] Schema + Drizzle migration design _(schema stub `store_memberships` via ADR-007; Kit migration → later)_
- [x] Domain + repos _(ADR-007 `src/modules/crm` + in-memory repo)_
- [ ] Integrate POS + storefront join _(use cases ready; POS ADR-009 / OTP wiring remain)_
- [x] Tests + STATUS _(domain tests green; ARD remains todo until API/UI)_

## Completion Protocol

Update STATUS + progress-log.
