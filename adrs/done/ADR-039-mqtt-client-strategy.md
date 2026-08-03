# ADR-039 — Realtime Client Strategy MQTT with Poll Fallback

| Field | Value |
| --- | --- |
| ID | ADR-039 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Browsers must receive updates.

## Problem Statement

WebSocket custom stack duplicates EMQX features.

## Decision

MQTT over WebSocket to EMQX; invalidate TanStack Query; poll fallback on disconnect.

## Why This Decision / Rationale

Resilience.

## Alternatives Considered

Native WS protocol from app servers.

## Tradeoffs

Client complexity.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Token mint API.

## Domain Impact

N/A

## Analytics Impact

Client reconnect metrics.

## Security Impact

Topic ACL.

## Implementation Requirements

Merchant UI boards; ARD-015.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-038, ADR-025

## Related ADRs

ADR-038, ADR-025

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

Topic ACL.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Push mobile later.

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
