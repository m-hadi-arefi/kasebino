# ARD-005 — Product Catalog

| Field | Value |
| --- | --- |
| ID | ARD-005 |
| Title | Product Catalog |
| Status | `todo` |
| Milestone | M1 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Implement product/category catalog with barcode uniqueness, search indexes, and soft delete.

## Business Value

Enables POS scanning and storefront browsing.

## Requirements

- POS-02
- POS-03
- SF-01
- SF-02
- Product* events

## Dependencies

- ARD-004

## Architecture

Catalog module; fuzzy search strategy (DB trigram or cached list + client fuzzy for MVP); barcode resolve path optimized.

## Domain Model

Aggregates Product, Category.

## API Contracts


| Method | Path |
| --- | --- |
| POST | `/api/v1/products` |
| GET | `/api/v1/products` |
| GET | `/api/v1/products/barcode/:code` |
| GET | `/api/v1/products/:id` |
| PATCH | `/api/v1/products/:id` |
| DELETE | `/api/v1/products/:id` | soft |


## Events

- `ProductCreated`
- `ProductUpdated`
- `ProductDeleted`

## Caching

Product/list/barcode keys TTL 300s; storefront 600s.

## Security

Validate prices; tenant unique barcode.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`categories`, `products`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: catalog schema + indexes

### Repository Interfaces

ProductRepository, CategoryRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Product create/update single TX + outbox

### Caching Strategy

product/barcode/list TTL 300s; storefront 600s


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`categories`, `products`

### Relationships

products.category_id → categories; both merchant-scoped

### Constraints

partial UNIQUE(merchant_id, barcode); partial UNIQUE(merchant_id, sku); price_amount >= 0

### Indexes

See indexing-strategy products section; trgm optional

### Query Patterns

barcode resolve; search; list; CRUD

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Hundreds–thousands products/merchant; grow with catalog

### Caching Plan

product/barcode/list TTL 300s; storefront 600s

### Migration Plan

catalog schema + indexes

## Testing

Search p95 path unit+bench; barcode resolve test.

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


- [ ] Barcode resolve ≤1s under test conditions
- [ ] Search responsive with cache
- [ ] Soft-deleted excluded from default lists

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
- Counter/scan UX optimized for noisy shop environments.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

No ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).

Inherits global DoD from PRD §17 / `docs/product/non-functional-requirements.md`, plus all acceptance criteria above and checklists below.

## Implementation Checklist

- [x] Schemas (domain + Drizzle stub; Kit migration deferred)
- [ ] APIs
- [ ] Search
- [ ] Cache
- [ ] UI forms via uiuxpromax
- [x] Tests (domain/unit)

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
- [ ] perf smoke barcode

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
