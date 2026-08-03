# ADR-038 — EMQX Event Bus / Realtime Architecture

| Field | Value |
| --- | --- |
| ID | ADR-038 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Merchants need live orders/sales/inventory.

## Problem Statement

Polling-only too slow/noisy.

## Decision

EMQX MQTT topics per merchant; QoS1; ACL by tenant; never block checkout on publish.

## Why This Decision / Rationale

Fits realtime reqs.

## Alternatives Considered

Pusher; SSE only; Redis pubsub only.

## Tradeoffs

Broker ops.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Topics in 17-message-broker.

## Domain Impact

Order/Sale fan-out.

## Analytics Impact

Disconnect metrics.

## Security Impact

Short-lived client creds.

## Implementation Requirements

ARD-015.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-036

## Related ADRs

ADR-036

## Related Documents

08-real-time-architecture.md

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

Short-lived client creds.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Cluster HA prod.

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
