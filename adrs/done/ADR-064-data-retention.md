# ADR-064 — Data Retention Strategy

| Field | Value |
| --- | --- |
| ID | ADR-064 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Cost, privacy, compliance.

## Problem Statement

Keep forever expensive/risky.

## Decision

Retention matrix: clickstream 90–180d; warehouse 24m; audit 24–36m; OLTP business records indefinite with Phase-2 archive; legal hold overrides.

## Why This Decision / Rationale

Balance.

## Alternatives Considered

Single TTL all data.

## Tradeoffs

Legal ambiguity open Q.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Mongo TTL indexes; jobs.

## Domain Impact

Soft delete ≠ analytics delete.

## Analytics Impact

N/A

## Security Impact

Compliance.

## Implementation Requirements

data-retention-architecture.md.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-056, ADR-058, ADR-041

## Related ADRs

ADR-056, ADR-058, ADR-041

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

Compliance.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Legal ADR when counsel decides.

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
