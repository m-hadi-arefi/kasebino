# ADR-057 — Event Warehouse Architecture

| Field | Value |
| --- | --- |
| ID | ADR-057 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need durable analytical history of domain events.

## Problem Statement

Scanning PG sales for every investigation bad.

## Decision

Outbox bridge mirrors domain events to Mongo mos_events idempotent by eventId.

## Why This Decision / Rationale

Investigation + aggregations.

## Alternatives Considered

Only EMQX retain; only PG.

## Tradeoffs

Storage growth—TTL 24m.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Consumer worker.

## Domain Impact

Full catalog mirror.

## Analytics Impact

Lag metrics.

## Security Impact

Admin browse only.

## Implementation Requirements

ARD-024.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-056, ADR-035, ADR-036

## Related ADRs

ADR-056, ADR-035, ADR-036

## Related Documents

event-warehouse-architecture.md

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

Admin browse only.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Cold storage archive.

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
