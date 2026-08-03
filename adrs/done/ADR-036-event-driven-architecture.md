# ADR-036 — Event-Driven Architecture

| Field | Value |
| --- | --- |
| ID | ADR-036 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Decouple realtime, analytics, cache.

## Problem Statement

Sync coupling brittle.

## Decision

Domain events + envelope + outbox; at-least-once; idempotent consumers.

## Why This Decision / Rationale

Extraction-ready.

## Alternatives Considered

Full event sourcing MVP.

## Tradeoffs

Eventual consistency complexity.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

event-catalog.md governance.

## Domain Impact

All BC publish past-tense events.

## Analytics Impact

Warehouse mirror.

## Security Impact

Scrub payloads in logs.

## Implementation Requirements

Every mutating ARD.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-002, ADR-029

## Related ADRs

ADR-002, ADR-029

## Related Documents

event-catalog.md

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

Scrub payloads in logs.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Schema registry later.

## Iranian User Experience Requirements

- **Persian localization impact:** User-visible realtime toasts/notifications Persian; wire schemas English OK.
- **RTL requirements:** Notification drawers RTL.
- **Mobile usability impact:** Realtime useful on shop floor mobiles without draining battery unnecessarily.
- **Iranian business workflow impact:** Pickup/POS events drive Iranian counter and customer wait perceptions.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
