# ARD-010 — Storefront

| Field | Value |
| --- | --- |
| ID | ARD-010 |
| Title | Storefront |
| Status | `todo` |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Dedicated **per-store** public storefront: branded catalog, PDPs, store info with map/nav entry, **pickup-only** checkout entry. Surface for QR (ARD-033) and Store PWA (ARD-029).

## Business Value

Extends retention beyond the counter; captures online demand into store-owned memberships.

## Requirements

- SF-01..04, SF-10, SF-11
- ORD-10, ORD-12
- LOC-02
- StorefrontVisited (+ source=qr)

## Dependencies

- ARD-004
- ARD-005
- ARD-011 / ARD-034 for pickup orders
- ARD-029 Store PWA
- ARD-033 QR
- ARD-027 / ARD-023 tracking

## Architecture

Public routes by **store slug**; ACL DTOs; cache-heavy reads.
**No delivery UI.** Branding from store. Emit funnel/tracking events when ARD-021+ present (failure-isolated).

## Domain Model

No new core aggregates; read models from catalog/store.

## API Contracts


| Method | Path |
| --- | --- |
| GET | `/api/v1/storefront/:slug` |
| GET | `/api/v1/storefront/:slug/products` |
| GET | `/api/v1/storefront/:slug/products/:id` |


## Events

- `StorefrontVisited`

## Caching

Storefront keys TTL 600s; invalidate on Product/Store/Merchant updates.

## Security

Public rate limits; no leakage of cost/PII fields.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

No new core tables; reads merchants/stores/products

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: None or covering index tweaks only

### Repository Interfaces

StorefrontReadRepository (infra query service OK if not aggregate) — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Read-only

### Caching Strategy

sf:* TTL 600s


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

No new core tables; reads merchants/stores/products

### Relationships

slug → merchant

### Constraints

N/A new

### Indexes

Ensure merchants.slug unique indexed

### Query Patterns

storefront catalog/product/merchant info

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Read-heavy; cache first

### Caching Plan

sf:* TTL 600s

### Migration Plan

None or covering index tweaks only

## Testing

Public page tests; cache tests; Lighthouse on key pages.

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


- [ ] Anonymous browse works
- [ ] Merchant info page
- [ ] Meets performance budgets §10 where applicable

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

No ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).

Inherits global DoD from PRD §17 / `docs/product/non-functional-requirements.md`, plus all acceptance criteria above and checklists below.

## Implementation Checklist

- [ ] uiuxpromax pages
- [ ] APIs
- [ ] Caching
- [ ] Tests

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
- [ ] lighthouse storefront sample

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
