# ARD-020 — Production Hardening

| Field | Value |
| --- | --- |
| ID | ARD-020 |
| Title | Production Hardening |
| Status | `todo` |
| Milestone | M6 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Close NFR/security/observability/landing quality gates: OTel wiring, error monitoring, rate limits audit, landing Lighthouse ≥95, pen-test smoke, DoD enforcement.

## Business Value

Launch readiness — M6 exit.

## Requirements

- NFR-01..10
- Security §14
- Observability §15
- Landing §13
- DoD §17

## Dependencies

- ARD-001..019 substantially complete for core product
- Coordinate with ARD-021–028 for analytics/observability gates (Mongo health, retention, correlationId)

## Architecture

Cross-cutting hardening pass; landing page via uiuxpromax; chaos/fallback verification including **Mongo degradation** (OLTP continues).

## Domain Model

N/A new; enforce invariants everywhere.

## API Contracts

Ensure all public/merchant routes covered by rate limit middleware matrix.

## Events

- `Ensure all MVP events observed in staging`

## Caching

Verify TTL classes; hit ratio dashboards.

## Security

Full security checklist; dependency audit.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

No new; hardening review of all

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: Only perf/security DDL if needed

### Repository Interfaces

Review all for tenant filters — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Chaos: TX rollback paths

### Caching Strategy

TTL/hit-ratio verification


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

No new; hardening review of all

### Relationships

Full graph review

### Constraints

Security/check review

### Indexes

EXPLAN on hot paths; add covering indexes if gaps

### Query Patterns

Perf smoke barcode/checkout/north-star

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Validate 50k merchant design assumptions

### Caching Plan

TTL/hit-ratio verification

### Migration Plan

Only perf/security DDL if needed

## Testing

Lighthouse CI; load smoke on checkout; tracing verification.

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


- [ ] Landing Lighthouse ≥95 all four categories
- [ ] Primary merchant screens >90
- [ ] OTel-ready instrumentation present
- [ ] Rate limits verified
- [ ] No lint/build warnings
- [ ] Global DoD checklist signed in progress-log

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.
- i18n plumbing installed early even if some strings temporary.

## RTL Requirements

- Implement RTL-first (`dir=rtl`, logical CSS).
- Mirror directional icons/navigation.
- No LTR-only layouts for in-scope screens.
- Scaffold app shell with `lang=fa` `dir=rtl` defaults for product apps.

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

- [ ] Landing via uiuxpromax
- [ ] Observability complete
- [ ] Security pass
- [ ] Perf pass
- [ ] Docs final sync

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
- [ ] lighthouse
- [ ] security checklist
- [ ] architecture validation

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
