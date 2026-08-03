# ADR-082 — Pickup-Only Fulfillment MVP Decision

| Field | Value |
| --- | --- |
| ID | ADR-082 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Fulfillment scope decision.

## Problem Statement

Delivery complexity.

## Decision

MVP supports only in-store pickup; forbid delivery/courier/rider/shipping features without superseding ADR. Default timers (ADR-091): unpaid cancel **30m**; ready_for_pickup hold **24h** then staff cancel + manual refund.

## Why This Decision / Rationale

Ship faster.

## Alternatives Considered

Offer both now.

## Tradeoffs

Miss delivery merchants.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

UX hides delivery.

## Domain Impact

Order.fulfillmentType=pickup.

## Analytics Impact

Pickup funnel only.

## Security Impact

Less PII addresses.

## Implementation Requirements

ARD-034.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-011, ADR-015

## Related ADRs

ADR-011, ADR-015

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

Less PII addresses.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Delivery ADR future.

## Iranian User Experience Requirements

- **Persian localization impact:** Pickup statuses and instructions in Persian (آماده تحویل، تکمیل، …).
- **RTL requirements:** Status timelines and CTAs RTL; no delivery-oriented LTR shipping UIs.
- **Mobile usability impact:** Customer navigates to store; merchant prepares order on phone/tablet.
- **Iranian business workflow impact:** Pickup-only matches Iranian neighborhood retail; never courier-first.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
