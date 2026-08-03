# ADR-090 — Notification Architecture

| Field | Value |
| --- | --- |
| ID | ADR-090 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Users need alerts (ready for pickup, low stock).

## Problem Statement

Only email spam.

## Decision

In-app notifications persisted; realtime topic; SMS campaigns later via credits; don't block core TX.

## Why This Decision / Rationale

Engagement.

## Alternatives Considered

SMS for everything.

## Tradeoffs

Channel overload.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

ARD-014.

## Domain Impact

OrderReadyForPickup notify.

## Analytics Impact

Notification metrics.

## Security Impact

Opt-in future.

## Implementation Requirements

ARD-014.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-036, ADR-038

## Related ADRs

ADR-036, ADR-038

## Related Documents

See docs/architecture and docs/tech as applicable.

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

Opt-in future.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Push web push.

## Iranian User Experience Requirements

- **Persian localization impact:** All notification templates Persian by default.
- **RTL requirements:** In-app notification center RTL.
- **Mobile usability impact:** SMS length-conscious Persian templates.
- **Iranian business workflow impact:** Order/loyalty notices match local customer expectations.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
