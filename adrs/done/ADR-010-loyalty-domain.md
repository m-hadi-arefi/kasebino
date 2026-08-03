# ADR-010 — Loyalty Architecture

| Field | Value |
| --- | --- |
| ID | ADR-010 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Points drive returns.

## Problem Statement

Informal discounts don't scale.

## Decision

Configurable PointRule; Wallet per membership; earn on sale and paid pickup; redeem at POS; customer-visible in portal.

## Why This Decision / Rationale

Closes loyalty growth loop.

## Alternatives Considered

Third-party loyalty SaaS.

## Tradeoffs

Expiry defaults locked in ADR-091 (12 months from last earn; configurable).

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Ledger append-only.

## Domain Impact

Points* events.

## Analytics Impact

FeatureUsed loyalty.

## Security Impact

Prevent negative balances.

## Implementation Requirements

ARD-009, 035.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-007, ADR-009

## Related ADRs

ADR-007, ADR-009

## Related Documents

growth-loops-loyalty.md

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

Prevent negative balances.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Campaigns MVP+. Expiry job semantics per ADR-091.

## Iranian User Experience Requirements

- **Persian localization impact:** Points, rewards, coupons, and wallet copy in Persian.
- **RTL requirements:** Reward lists and progress indicators RTL.
- **Mobile usability impact:** Customer redemption flows touch-friendly in store PWA.
- **Iranian business workflow impact:** Loyalty mechanics explainable without marketing English buzzwords.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
