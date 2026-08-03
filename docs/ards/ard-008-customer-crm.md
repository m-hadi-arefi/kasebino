# ARD-008 — Customer CRM

| Field | Value |
| --- | --- |
| ID | ARD-008 |
| Title | Customer CRM |
| Status | `todo` |
| Milestone | M2 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Merchant-facing CRM for **store-owned members**: profiles, purchase history, segmentation — backed by first-class `StoreMembership` (see ARD-031).

## Business Value

Turns POS and storefront capture into owned relationships the store controls.

## Requirements

- CRM-01..04
- MEM-01, MEM-02 (with ARD-031)
- Customer* + Membership* events

## Dependencies

- ARD-003
- ARD-031 Customer Membership Domain
- ARD-007 for history source

## Architecture

CRM module; segmentation policy; projections for stats.

## Domain Model

Customer aggregate + EngagementStats VO.

## API Contracts


| Method | Path |
| --- | --- |
| GET | `/api/v1/customers` |
| GET | `/api/v1/customers/:id` |
| GET | `/api/v1/customers/by-phone/:phone` |
| GET | `/api/v1/customers/:id/purchases` |
| PATCH | `/api/v1/customers/:id` |


## Events

- `CustomerCreated`
- `CustomerUpdated`
- `CustomerDeleted`
- `CustomerReturned`

## Caching

Customer/phone/stats keys TTL 300s.

## Security

PII minimization in logs; soft delete.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`customers` (+ stats columns or side table)

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: crm schema

### Repository Interfaces

CustomerRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Upsert during sale TX; profile updates standalone

### Caching Strategy

customer/phone/stats TTL 300s


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`customers` (+ stats columns or side table)

### Relationships

sales.customer_id → customers

### Constraints

partial UNIQUE(merchant_id, phone); soft delete

### Indexes

phone; last_purchase_at; total_spend; created_at

### Query Patterns

upsert by phone; profile; list; purchase history join sales

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: 5M+ customers envelope

### Caching Plan

customer/phone/stats TTL 300s

### Migration Plan

crm schema

## Testing

Segment transition tests; isolation tests.

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


- [ ] Profile + purchase history visible
- [ ] Segments update from sales without manual rebuild in UI
- [ ] Soft-deleted excluded by default

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

- [ ] Domain+API+UI
- [ ] Event handlers for segments
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

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
