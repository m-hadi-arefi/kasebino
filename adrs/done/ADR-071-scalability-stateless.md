# ADR-071 — Scalability Stateless Multi-Instance

| Field | Value |
| --- | --- |
| ID | ADR-071 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Growth to many merchants.

## Problem Statement

Sticky sessions / local memory limit scale.

## Decision

Stateless app; JWT; shared Redis/PG/Mongo/EMQX; horizontal scale behind LB.

## Why This Decision / Rationale

NFR-02.

## Alternatives Considered

Vertical only.

## Tradeoffs

Shared DB becomes bottleneck—mitigate with indexes/cache/projections.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

No sticky required.

## Domain Impact

N/A

## Analytics Impact

DAM capacity planning.

## Security Impact

N/A

## Implementation Requirements

All services.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-004, ADR-033, ADR-051

## Related ADRs

ADR-004, ADR-033, ADR-051

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

N/A

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Read replicas / partition ADR.

## Iranian User Experience Requirements

- **Persian localization impact:** Ops docs may be English; any merchant-visible status must be Persian.
- **RTL requirements:** N/A unless operator UI ships — then RTL Persian.
- **Mobile usability impact:** Deployments must not regress mobile asset performance.
- **Iranian business workflow impact:** Infra supports Iran hosting/latency considerations as documented in ops ADRs.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [ ] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [ ] Decision reflected in code and docs
- [ ] Dependent ADRs unblocked as needed
- [ ] Tests/validation for impacted areas green
- [ ] `adrs/STATUS.md` marked `completed`
