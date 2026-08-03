# ADR-007 — Customer Membership Model

| Field | Value |
| --- | --- |
| ID | ADR-007 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Stores must own customer bases.

## Problem Statement

Phone capture alone without membership blur ownership and loyalty scope.

## Decision

First-class StoreMembership (storeId,customerId,source); wallets scoped to membership; customer identity separate from merchant auth.

## Why This Decision / Rationale

Supports POS/QR/pickup join paths and portal.

## Alternatives Considered

Global wallet across stores; shared CRM pool.

## Tradeoffs

Multi-membership UX complexity.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

store_memberships unique partial index.

## Domain Impact

MembershipCreated events.

## Analytics Impact

Join funnel by source.

## Security Impact

Tenant filters on all member queries.

## Implementation Requirements

ARD-031, 030, 008, 035.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-003, ADR-006

## Related ADRs

ADR-003, ADR-006

## Related Documents

customer-membership-architecture.md

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

Tenant filters on all member queries.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Cross-store loyalty programs Phase 2.

## Iranian User Experience Requirements

- **Persian localization impact:** Membership UX, empty states, and CRM notes display Persian.
- **RTL requirements:** Customer lists and membership cards are RTL.
- **Mobile usability impact:** Phone capture and membership join optimized for counter + personal mobile.
- **Iranian business workflow impact:** Membership keyed by Iranian mobile; loyalty language familiar locally.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
