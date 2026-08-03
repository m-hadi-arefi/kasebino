# ARD-009 — Loyalty

| Field | Value |
| --- | --- |
| ID | ARD-009 |
| Title | Loyalty |
| Status | `todo` |
| Milestone | M2 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Configurable points, wallet (scoped to **store membership**), coupons/rewards, earn/redeem at POS and on paid pickup orders, expiry job and events; customer-visible via ARD-035. Aligns with loyalty growth loop.

## Business Value

Incentivizes repeat purchases — direct North Star lever.

## Requirements

- LYL-01..04
- Points* events
- `docs/product/growth-loops-loyalty.md`

## Dependencies

- ARD-008
- ARD-031
- ARD-007 integration
- ARD-035 for customer portal views

## Architecture

Loyalty module; PointRule; Wallet ledger **per StoreMembership**; coupon aggregates; expire job.

## Domain Model

See domain-model Loyalty section.

## API Contracts


| Method | Path |
| --- | --- |
| GET/PUT | `/api/v1/loyalty/rules` |
| GET | `/api/v1/loyalty/wallet/:customerId` |
| POST | `/api/v1/loyalty/redeem` |
| POST | `/api/v1/loyalty/coupons` |
| POST | `/api/v1/loyalty/coupons/redeem` |


## Events

- `PointsEarned`
- `PointsRedeemed`
- `PointsExpired`
- `Campaign* optional stubs`

## Caching

Wallet cache invalidate on points events.

## Security

Redeem authZ; prevent negative balance.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`point_rules`, `wallets`, `points_ledger`, `coupons`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: loyalty schema

### Repository Interfaces

WalletRepository, PointRuleRepository, CouponRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Redeem/earn inside CompleteSale TX or immediate follow-up same TX

### Caching Strategy

wallet keys invalidate on points events


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`point_rules`, `wallets`, `points_ledger`, `coupons`

### Relationships

wallet per customer; ledger → wallet/customer; coupons merchant-scoped

### Constraints

wallet balance >= 0; version on wallet; ledger immutable inserts

### Indexes

wallet unique(merchant_id,customer_id); ledger(customer,created_at); unique earn per sale_id

### Query Patterns

earn/redeem; wallet get; expire job

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: ledger high write with sales

### Caching Plan

wallet keys invalidate on points events

### Migration Plan

loyalty schema

## Testing

Earn/redeem/expiry tests; concurrent redeem safety.

## Acceptance Criteria

- [ ] Drizzle migrations generated and reviewed
- [ ] Table design reviewed
- [ ] Query patterns reviewed
- [ ] Indexes + composite indexes reviewed
- [ ] Multi-tenancy (`merchant_id`) reviewed
- [ ] PostgreSQL performance considerations reviewed
- [ ] Drizzle schema reviewed against DB design (ORM follows DB)
- [ ] Cache strategy reviewed
- [ ] Repository interfaces + Drizzle implementations aligned
- [ ] Transaction boundaries implemented/documented


- [ ] Sale awards points per rule
- [ ] Redeem decreases wallet + event
- [ ] Expiry publishes PointsExpired
- [ ] Wallet visible in UI

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.

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

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

No ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).

Inherits global DoD from PRD §17 / `docs/product/non-functional-requirements.md`, plus all acceptance criteria above and checklists below.

## Implementation Checklist

- [x] Rules engine
- [x] Wallet ledger
- [x] POS integration
- [ ] UI
- [ ] Job
- [x] Tests

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] tests

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
