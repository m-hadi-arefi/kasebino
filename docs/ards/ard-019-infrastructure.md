# ARD-019 — Infrastructure Hardening

| Field | Value |
| --- | --- |
| ID | ARD-019 |
| Title | Infrastructure Hardening |
| Status | `todo` |
| Milestone | M5 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Production-ready compose/k8s-ready configs, backups guidance, secrets management pattern, staging topology, migration strategy — including **MongoDB** analytics data plane alongside PostgreSQL/Redis/EMQX/MinIO.

## Business Value

Makes environments operable beyond developer laptops.

## Requirements

- NFR-02
- NFR-03
- PRD §16
- MongoDB topology for ARD-021+

## Dependencies

- ARD-001
- Align with ARD-021 Analytics Platform

## Architecture

Refine Dockerfiles, health, resource configs, runbooks; outbox worker process definition; horizontal scale notes; **MongoDB** sizing, backup, and retention ops per `mongodb-architecture.md` and `data-retention-architecture.md`.

## Domain Model

N/A

## API Contracts

Ops endpoints already from ARD-001; add metrics exposition if planned.

## Events

- None

## Caching

Redis HA notes; no code flush tools.

## Security

Secrets only via env/secret store; network policies documented.


## UI Requirements

- No end-user UI in this ARD (API/infra/domain only). If UI sneaks in, stop and update ARD scope.



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

No product tables; ops around existing DB

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: Migrate job in deploy pipeline (Drizzle Kit)

### Repository Interfaces

N/A — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Migration windows documented

### Caching Strategy

N/A


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

No product tables; ops around existing DB

### Relationships

N/A

### Constraints

N/A

### Indexes

Review pg_stat / missing indexes in staging

### Query Patterns

Backup/restore validation queries

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Ops

### Caching Plan

N/A

### Migration Plan

Migrate job in deploy pipeline (Drizzle Kit)

## Testing

Staging deploy dry-run checklist.

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


- [ ] Staging deploy docs complete
- [ ] Zero-downtime strategy documented & scripted where possible
- [ ] Backup/restore runbook exists

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

- [x] Prod Dockerfile
- [ ] Runbooks
- [ ] Worker defs
- [x] CI quality-gate scaffolding (ADR-069 `.github/workflows/ci.yml` + `src/cicd-strategy`; CD deploy scaffolding → ADR-070)

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] compose prod-like smoke
- [ ] runbook review

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
