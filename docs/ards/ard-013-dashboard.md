# ARD-013 — Dashboard Shell

| Field | Value |
| --- | --- |
| ID | ARD-013 |
| Title | Dashboard Shell |
| Status | `todo` |
| Milestone | M3 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

> **ADR-088 foundations (2026-08-03):** `src/merchant-dashboard` + enhanced `(merchant)/dashboard` Persian AN overview stubs (auth merchant-only, cache-aside TTL 60s, `DashboardWidgetViewed` reserved, conceptual wire to `merchant-oltp-analytics`). ARD remains `todo` until live overview API load, CRM-04 surface, and Lighthouse path.

## Objective

Merchant application shell: navigation, home overview widgets wired to analytics APIs, responsive layout.

## Business Value

Daily home base for merchants to see retention pulse.

## Requirements

- AN-01 surface
- CRM-04 surface
- NFR-06
- NFR-09

## Dependencies

- ARD-002
- ARD-003
- ARD-016 for deep analytics widgets

## Architecture

App layout under (merchant) group; overview cards calling analytics endpoints; empty states.

## Domain Model

No new aggregates; consumes analytics read models.

## API Contracts


| Method | Path |
| --- | --- |
| GET | `/api/v1/analytics/overview` |


## Events

- `Dashboard refresh via realtime hints (optional)`

## Caching

Overview cache TTL 60s.

## Security

Auth only.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

Consumes `analytics_*` projections (may stub overview from sales if ARD-016 not done)

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: None or thin projection stub

### Repository Interfaces

AnalyticsQueryRepository (read) — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Read-only

### Caching Strategy

analytics:overview


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

Consumes `analytics_*` projections (may stub overview from sales if ARD-016 not done)

### Relationships

N/A

### Constraints

N/A

### Indexes

Depend on projection PKs (merchant_id)

### Query Patterns

GET overview

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Read path; cache 60s

### Caching Plan

analytics:overview

### Migration Plan

None or thin projection stub

## Testing

Render tests; mobile layout tests.

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


- [ ] Overview loads for activated merchant
- [ ] Mobile responsive
- [ ] Lighthouse >90 target path

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

- [ ] uiuxpromax shell
- [ ] Nav
- [ ] Overview widgets
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
- [ ] lighthouse sample

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
