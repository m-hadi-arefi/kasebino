# ARD-004 — Store Management

| Field | Value |
| --- | --- |
| ID | ARD-004 |
| Title | Store Management |
| Status | `todo` |
| Milestone | M1 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Allow merchants to create/update store profiles: name, contact, hours, **mandatory address + lat/lng**, branding hooks, storefront slug — foundation for dedicated storefront, QR, and maps.

## Business Value

Anchors physical location, inventory, pickup fulfillment, and customer-facing store identity.

## Requirements

- SF-04, SF-10/11 hooks, LOC-01
- Store* events including geo
- Schema allows multiple stores; each store gets own storefront surface

## Dependencies

- ARD-003
- ARD-032 for map presentation deep links (may stub lat/lng first)

## Architecture

Store module under merchant; default store auto-create optional on merchant create.

## Domain Model

Aggregate Store; events StoreCreated/Updated.

## API Contracts


| Method | Path |
| --- | --- |
| POST | `/api/v1/stores` |
| GET | `/api/v1/stores` |
| GET | `/api/v1/stores/:id` |
| PATCH | `/api/v1/stores/:id` |


## Events

- `StoreCreated`
- `StoreUpdated`

## Caching

Store keys TTL 300s; storefront info 600s invalidate on update.

## Security

Merchant-scoped authZ.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`stores`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: store schema

### Repository Interfaces

StoreRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Single aggregate writes

### Caching Strategy

store keys TTL 300s; storefront info 600s


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`stores`

### Relationships

stores.merchant_id → merchants.id

### Constraints

NOT NULL merchant_id,name; soft delete

### Indexes

(merchant_id); (merchant_id, created_at)

### Query Patterns

CRUD stores; list by merchant

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: ≤ few stores per merchant (multi-store future)

### Caching Plan

store keys TTL 300s; storefront info 600s

### Migration Plan

store schema

## Testing

CRUD + isolation tests.

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


- [ ] Store CRUD works
- [ ] Events + cache invalidation
- [ ] UI for store settings

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

- [x] Domain model + events + in-memory repo (ADR-006 Foundations; API/UI/migration remain)
- [ ] Implement API/UI + Drizzle Kit migration
- [x] Domain unit tests (ADR-006)
- [x] Docs (plan + progress-log)

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
