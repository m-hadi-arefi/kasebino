# ADR-011 — Pickup Order Architecture

| Field | Value |
| --- | --- |
| ID | ADR-011 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Online demand without delivery ops.

## Problem Statement

Delivery scope explodes MVP.

## Decision

Orders are pickup-only; statuses pending_payment→paid→preparing→ready_for_pickup→picked_up→completed|cancelled|refunded.

## Why This Decision / Rationale

Fits local retail foot traffic.

## Alternatives Considered

Delivery; marketplace shipping.

## Tradeoffs

No courier revenue.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Order status enum; no shipping tables.

## Domain Impact

Pickup events replace OrderDelivered.

## Analytics Impact

Pickup funnel metrics.

## Security Impact

Refunds audited.

## Implementation Requirements

ARD-011, 034, 012.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-006, ADR-007, ADR-008

## Related ADRs

ADR-006, ADR-007, ADR-008

## Related Documents

pickup-order-architecture.md

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

Refunds audited.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Delivery requires new ADR.

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
