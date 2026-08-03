# ADR-013 — Admin Domain

| Field | Value |
| --- | --- |
| ID | ADR-013 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Platform ops need control.

## Problem Statement

Merchant APIs must not imply admin powers.

## Decision

Separate platform_admin role; merchant activate/suspend; security monitoring hooks.

## Why This Decision / Rationale

Protects multi-tenant SaaS.

## Alternatives Considered

All merchants are admins.

## Tradeoffs

Extra UI surface.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

admin routes; audit every action.

## Domain Impact

AdminAction events.

## Analytics Impact

Mgmt dashboards ARD-025.

## Security Impact

Strict RBAC.

## Implementation Requirements

ARD-018, 026.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-005

## Related ADRs

ADR-005

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

Strict RBAC.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Growth tooling Phase 2.

## Iranian User Experience Requirements

- **Persian localization impact:** Admin console copy Persian by default; privilege warnings plain Persian.
- **RTL requirements:** Admin tables/filters RTL.
- **Mobile usability impact:** Ops usable on laptop; critical alerts readable on mobile.
- **Iranian business workflow impact:** Internal ops still respect Iranian merchant data presentation (Jalali, تومان).

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
