# ADR-066 — Docker and Compose Local Parity

| Field | Value |
| --- | --- |
| ID | ADR-066 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Dev/prod parity.

## Problem Statement

Works on my machine.

## Decision

Compose: app, postgres, redis, emqx, minio, mongo; healthchecks; named volumes.

## Why This Decision / Rationale

Onboarding speed.

## Alternatives Considered

Dev services unmanaged local installs only.

## Tradeoffs

Heavier laptops.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

docker-compose.yml ARD-001/019.

## Domain Impact

N/A

## Analytics Impact

N/A

## Security Impact

Don't commit secrets.

## Implementation Requirements

ARD-001.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-004

## Related ADRs

ADR-004

## Related Documents

12-infrastructure-architecture.md

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

Don't commit secrets.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Tilt/devspace later.

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
