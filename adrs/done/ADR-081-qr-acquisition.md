# ADR-081 — QR Acquisition Architecture Decision

| Field | Value |
| --- | --- |
| ID | ADR-081 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Physical to digital acquisition.

## Problem Statement

No attribution.

## Decision

Stable storefront URL in QR with src=qr; printable assets; membership source=qr; analytics funnel.

## Why This Decision / Rationale

Growth loop.

## Alternatives Considered

Only paper coupons.

## Tradeoffs

Print ops.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

ARD-033.

## Domain Impact

MembershipCreated source.

## Analytics Impact

Conversion metrics.

## Security Impact

No secrets in QR.

## Implementation Requirements

growth-loops-qr.md.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-006, ADR-023, ADR-007

## Related ADRs

ADR-006, ADR-023, ADR-007

## Related Documents

qr-acquisition-architecture.md

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

No secrets in QR.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Campaign QR ids.

## Iranian User Experience Requirements

- **Persian localization impact:** QR landing and first-run copy Persian.
- **RTL requirements:** Landing RTL; CTA large for outdoor/window glare scenarios.
- **Mobile usability impact:** Fast first paint on mobile data after scan.
- **Iranian business workflow impact:** Sticker/QR loops for physical Iranian storefronts.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
