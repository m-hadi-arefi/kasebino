# ARD-016 — Analytics (Merchant OLTP Dashboards)

| Field | Value |
| --- | --- |
| ID | ARD-016 |
| Title | Analytics (Merchant OLTP Dashboards) |
| Status | `todo` |
| Milestone | M3 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

> **ADR-014 foundations (2026-08-03):** Dual-plane analytics boundaries in `src/analytics-boundaries` — AN-01..04 locked to PostgreSQL projections; money truth PG; Persian RTL Jalali report UX contract.
>
> **ADR-063 foundations (2026-08-03):** `src/merchant-oltp-analytics` + `src/modules/analytics` — AN merchant overview from PG via sales/membership counter ports, Persian titles, Jalali range helpers stub, Redis TTL 60s note, in-memory `SaleCompleted` daily revenue projection apply.
>
> **ADR-088 UI stubs (2026-08-03):** `src/merchant-dashboard` — Persian RTL AN overview widget stubs wired conceptually to OLTP API paths; `DashboardWidgetViewed` reserved; cache-aside TTL 60s. This ARD remains `todo` until Drizzle Kit projection migrations, query HTTP APIs, live Redis wiring, and live chart pages.

## Objective

Revenue, customer, and retention dashboards including Monthly Returning Customers North Star; **PostgreSQL projection tables** with Redis TTL 60s.

## Scope boundary (important)

This ARD is **merchant operational analytics on OLTP data** (AN-01..04).

It does **not** own product analytics, clickstream, event warehouse, or platform management dashboards — those are **ARD-021+** on **MongoDB**. See `docs/architecture/analytics-architecture.md`.

## Business Value

Proves product value and guides merchant action.

## Requirements

- AN-01..04
- success metrics

## Dependencies

- ARD-007
- ARD-008
- ARD-011 preferred
- ARD-013 shell
- Cross-link only: ARD-021+ for product/platform analytics (not blocking)

## Architecture

Analytics projections updated by events in **PostgreSQL** (Drizzle); query APIs with Redis TTL 60s. Mirror of domain events into Mongo warehouse is ARD-024 — do not dual-implement rollups in Mongo for AN-* widgets.

## Domain Model

Read models only.

## API Contracts


| Method | Path |
| --- | --- |
| GET | `/api/v1/analytics/overview` |
| GET | `/api/v1/analytics/revenue` |
| GET | `/api/v1/analytics/customers` |
| GET | `/api/v1/analytics/retention` |


## Events

- `Consumes SaleCompleted`
- `OrderPaid`
- `CustomerReturned`
- `Points* optional`

## Caching

Analytics keys TTL 60s; invalidate on consuming events.

## Security

Merchant scoped only.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`analytics_daily_revenue`, `analytics_customer_stats`, `analytics_retention_stats` (names illustrative)

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: analytics projections schema

### Repository Interfaces

AnalyticsProjectionRepository, AnalyticsQueryRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Projection upserts per event handler (idempotent)

### Caching Strategy

TTL 60s; invalidate on SaleCompleted/OrderPaid/CustomerReturned


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`analytics_daily_revenue`, `analytics_customer_stats`, `analytics_retention_stats` (names illustrative)

### Relationships

PK merchant_id + day/period

### Constraints

non-negative metrics

### Indexes

PK/ unique (merchant_id, day)

### Query Patterns

overview/revenue/customers/retention widgets

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Rows ≈ merchants × days; not 50M sales scanned

### Caching Plan

TTL 60s; invalidate on SaleCompleted/OrderPaid/CustomerReturned

### Migration Plan

analytics projections schema

## Testing

North Star computation tests with fixtures.

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


- [ ] Dashboards reflect completed sales within TTL window
- [ ] Retention computes Monthly Returning Customers
- [ ] Aggregations cache-backed

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
- Reports: Persian labels + Jalali/`Asia/Tehran` buckets for humans.

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

- [ ] Projections
- [ ] APIs
- [ ] UI charts via uiuxpromax
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
