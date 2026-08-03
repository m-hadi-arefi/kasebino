# ADR-014 — Analytics Domain Boundaries OLTP vs Mongo

| Field | Value |
| --- | --- |
| ID | ADR-014 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need merchant KPIs and product/platform telemetry.

## Problem Statement

Putting clickstream in Postgres endangers POS.

## Decision

OLTP merchant dashboards (AN-*) on PostgreSQL projections; product/audit/warehouse/clickstream on MongoDB.

## Why This Decision / Rationale

Protects latency; flexible telemetry.

## Alternatives Considered

Single store for all analytics.

## Tradeoffs

Two query stacks.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

ARD-016 vs 021–028.

## Domain Impact

Money truth stays PG.

## Analytics Impact

Dual-read discipline.

## Security Impact

Admin-only platform analytics.

## Implementation Requirements

analytics-architecture.md.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-001, ADR-003

## Related ADRs

ADR-001, ADR-003

## Related Documents

ADR-056+

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

Admin-only platform analytics.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Warehouse→warehouse BI later.

## Iranian User Experience Requirements

- **Persian localization impact:** Dashboard titles, legends, and exports for humans are Persian; event codes may be English.
- **RTL requirements:** Charts and filter bars layout RTL; axes/tooltips readable in Persian.
- **Mobile usability impact:** Reports skimable on tablet; avoid huge desktop-only bi tools for merchants.
- **Iranian business workflow impact:** Time buckets Jalali/`Asia/Tehran` for merchant-facing analytics.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
