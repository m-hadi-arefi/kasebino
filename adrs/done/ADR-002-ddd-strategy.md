# ADR-002 — Domain-Driven Design Strategy

| Field | Value |
| --- | --- |
| ID | ADR-002 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Complex retail domains (POS, loyalty, orders, analytics) must stay maintainable.

## Problem Statement

Anemic CRUD or framework-centric models produce untestable business rules.

## Decision

Strict DDD: aggregates, VOs, domain events, repository interfaces in domain; application use cases; infra adapters.

## Why This Decision / Rationale

Enables extraction, testability, and ubiquitous language from PRD.

## Alternatives Considered

Transaction script only; microservices-from-day-one.

## Tradeoffs

More upfront modeling than CRUD.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Folder layout src/modules/<context>/{domain,application,infrastructure}.

## Domain Impact

All bounded contexts follow domain-model.md.

## Analytics Impact

Domain events feed warehouse.

## Security Impact

Invariants in domain not UI.

## Implementation Requirements

Enforce via rules/ddd-rules.md and reviews.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-001

## Related ADRs

ADR-001

## Related Documents

docs/architecture/14-ddd-architecture.md; domain-model.md

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

Invariants in domain not UI.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

CQRS/ES optional later.

## Iranian User Experience Requirements

- **Persian localization impact:** Ubiquitous language for code may be English; domain events and user notifications resolve to Persian presentation.
- **RTL requirements:** UI bounded to contexts must still render RTL; context boundaries do not justify LTR UX.
- **Mobile usability impact:** Domain operations on POS/mobile must stay low-latency for Iranian peak hours.
- **Iranian business workflow impact:** Contexts model Iranian retail realities (phone membership, pickup, تومان money concepts).

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
