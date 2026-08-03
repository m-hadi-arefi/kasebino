# ADR-015 — MVP Scope Guardrails and Non-Goals

| Field | Value |
| --- | --- |
| ID | ADR-015 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Scope creep into ERP/delivery kills MVP.

## Problem Statement

AI agents may invent features.

## Decision

Hard non-goals: delivery/courier/shipping, marketplace browsing, full accounting, supplier networks, desktop offline suite.

## Why This Decision / Rationale

Keeps ARD/ADR executable.

## Alternatives Considered

Build everything now.

## Tradeoffs

Deferred revenue streams.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Skill prohibitions encode this.

## Domain Impact

No delivery aggregates.

## Analytics Impact

No delivery funnels.

## Security Impact

Less attack surface.

## Implementation Requirements

Reject PRs/ADRs violating non-goals without superseding ADR.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-001

## Related ADRs

ADR-001

## Related Documents

PRD §3

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

Less attack surface.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Supersede via new ADR only.

## Iranian User Experience Requirements

- **Persian localization impact:** Out-of-scope Western features must not displace Persian MVP polish.
- **RTL requirements:** Do not accept LTR-only third-party embeds that break merchant UX without ADR.
- **Mobile usability impact:** Protect mobile performance against feature creep.
- **Iranian business workflow impact:** Keep Iranian pickup/SMS/POS priorities over delivery/marketplace.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
