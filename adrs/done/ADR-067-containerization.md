# ADR-067 — Containerization Standards

| Field | Value |
| --- | --- |
| ID | ADR-067 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need deployable artifacts.

## Problem Statement

Fat images insecure.

## Decision

Multi-stage Dockerfile; non-root; Next standalone; .dockerignore; no secrets baked.

## Why This Decision / Rationale

Production readiness.

## Alternatives Considered

VM amber deploy.

## Tradeoffs

Build complexity.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Image scan in CI when available.

## Domain Impact

N/A

## Analytics Impact

N/A

## Security Impact

Critical.

## Implementation Requirements

ARD-019.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-066

## Related ADRs

ADR-066

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

Critical.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Distroless later.

## Iranian User Experience Requirements

- **Persian localization impact:** Ops docs may be English; any merchant-visible status must be Persian.
- **RTL requirements:** N/A unless operator UI ships — then RTL Persian.
- **Mobile usability impact:** Deployments must not regress mobile asset performance.
- **Iranian business workflow impact:** Infra supports Iran hosting/latency considerations as documented in ops ADRs.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
