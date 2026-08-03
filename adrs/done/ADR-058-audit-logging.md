# ADR-058 — Audit Logging Architecture

| Field | Value |
| --- | --- |
| ID | ADR-058 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Compliance and forensics.

## Problem Statement

App logs insufficient as evidence.

## Decision

Insert-only Mongo mos_audit for sensitive actions; optional thin PG; no update API.

## Why This Decision / Rationale

Evidence grade.

## Alternatives Considered

PG-only audit forever.

## Tradeoffs

Async delay.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

AuditPort after commit.

## Domain Impact

Auth, money, admin, stock adjust.

## Analytics Impact

N/A

## Security Impact

Access to audit audited.

## Implementation Requirements

ARD-022.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-056, ADR-034

## Related ADRs

ADR-056, ADR-034

## Related Documents

audit-architecture.md

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

Access to audit audited.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Hash chain optional.

## Iranian User Experience Requirements

- **Persian localization impact:** Audit UIs showing actions to humans use Persian labels; raw payloads may be JSON English keys.
- **RTL requirements:** Audit viewers RTL.
- **Mobile usability impact:** Investigations possible on modest ops devices.
- **Iranian business workflow impact:** Retention/compliance messaging for Iranian operators when exposed.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
