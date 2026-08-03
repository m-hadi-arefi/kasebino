# ADR-003 — Bounded Context Design

| Field | Value |
| --- | --- |
| ID | ADR-003 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Multiple languages (sale vs order vs analytics) coexist.

## Problem Statement

Shared god models couple storefront to POS internals.

## Decision

Contexts: Identity (merchant), Customer Identity, Merchant, Store, Catalog, Inventory, POS/Sales, CRM/Membership, Loyalty, Ordering(Pickup), Payments, Analytics(OLTP), Analytics(Platform/Mongo), Notifications, Admin, Realtime.

## Why This Decision / Rationale

Matches product seams and ARD packaging.

## Alternatives Considered

Single shared kernel for everything.

## Tradeoffs

More integration events.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Context map in 03-bounded-contexts.md; ACLs for storefront.

## Domain Impact

Published language via events.

## Analytics Impact

Warehouse mirrors domain events.

## Security Impact

Admin separate role context.

## Implementation Requirements

Implement module per context.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-002

## Related ADRs

ADR-002

## Related Documents

docs/architecture/03-bounded-contexts.md

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

Admin separate role context.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Extract contexts per ADR on microservices.

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
