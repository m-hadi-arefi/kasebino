# ADR-042 — Drizzle ORM Exclusive Strategy

| Field | Value |
| --- | --- |
| ID | ADR-042 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need typed SQL-first access.

## Problem Statement

Prisma previously considered; weak for explicit SQL/index control desired.

## Decision

Drizzle ORM only SQL ORM; Kit migrations; repos in infra; domain never imports Drizzle. Forbidden: Prisma/TypeORM/Sequelize/MikroORM/Objection.

## Why This Decision / Rationale

SQL transparency + DDD fit.

## Alternatives Considered

Prisma; raw pg only.

## Tradeoffs

Less battery-included migrate UX than some ORMs.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

schema/migrations under infrastructure/database.

## Domain Impact

Mapping adapters.

## Analytics Impact

N/A

## Security Impact

Parameterized only.

## Implementation Requirements

All PG ARDs; supersedes docs/decisions ADR-0007 numbering.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-041

## Related ADRs

ADR-041

## Related Documents

docs/tech/drizzle-orm.md

## Migration Plan

- If greenfield: implement when this ADR is reached on the roadmap.
- If superseding prior practice: expand/contract; update ARDs; never silent break.

## Testing Requirements

- Acceptance criteria implied by Decision must be testable.
- Tenant isolation and authZ tests when data/auth touched.
- Performance budgets when POS/storefront touched.

## Operational Requirements

- Health/ready and runbooks updated if infra changes.
- Metrics/alerts for new failure modes.

## Security Considerations

Parameterized only.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Stay current major.

## Iranian User Experience Requirements

- **Persian localization impact:** UTF-8 Persian text columns; search/indexing plans for Persian product/customer text; no ASCII-only collations.
- **RTL requirements:** N/A at SQL layer for visual RTL; presentation still RTL.
- **Mobile usability impact:** Query budgets protect POS mobile latency.
- **Iranian business workflow impact:** Tenant data models Iranian merchants/stores; barcode+name search for local catalogs.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
