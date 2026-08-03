# ADR-024 — Offline-First Staff POS Strategy

| Field | Value |
| --- | --- |
| ID | ADR-024 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Flaky networks at counters.

## Problem Statement

Silent conflict on sync dangerous.

## Decision

Online-first P0; offline queue P1; conflict=reject-and-review on stock shortage; idempotent sync keys.

## Why This Decision / Rationale

Safe degradation.

## Alternatives Considered

Full offline-first CRDT.

## Tradeoffs

P1 delay acceptable.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Sync API; IDB drafts.

## Domain Impact

SaleCompleted on sync.

## Analytics Impact

Sync failure metrics.

## Security Impact

No silent double charge.

## Implementation Requirements

ARD-017; ADR-0005.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-022, ADR-009

## Related ADRs

ADR-022, ADR-009

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

No silent double charge.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Richer conflict UI later.

## Iranian User Experience Requirements

- **Persian localization impact:** Staff PWA strings Persian; offline banners Persian.
- **RTL requirements:** RTL shell separate from customer store PWA.
- **Mobile usability impact:** Installability and offline queue UX for low-connectivity shops.
- **Iranian business workflow impact:** Cashier workflows: barcode, phone, totaling in تومان.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
