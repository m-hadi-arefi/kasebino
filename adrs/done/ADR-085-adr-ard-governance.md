# ADR-085 — ADR and ARD Governance Completion Rules

| Field | Value |
| --- | --- |
| ID | ADR-085 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need executable governance for AI/human.

## Problem Statement

Docs without process drift.

## Decision

ADRs in /adrs are architecture source of truth; ARDs are implementation packages; no code without covering ADR+ARD; status boards; dependency maps; ard-to-code executes ADR order first-class.

## Why This Decision / Rationale

Autonomous buildability.

## Alternatives Considered

Ad-hoc coding.

## Tradeoffs

Process overhead.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

STATUS in adrs/STATUS.md; roadmap docs.

## Domain Impact

All domains covered by ADR map.

## Analytics Impact

N/A

## Security Impact

N/A

## Implementation Requirements

This ADR set + AGENT + skill.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-001

## Related ADRs

ADR-001

## Related Documents

adr-roadmap.md

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

Add ADRs for new decisions only.

## Iranian User Experience Requirements

- **Persian localization impact:** Governance docs in English OK; mandate Iranian First in every ADR/ARD process.
- **RTL requirements:** Process checklists include RTL/Persian gates.
- **Mobile usability impact:** N/A beyond ensuring mobile UX DoD enforced.
- **Iranian business workflow impact:** No Accepted implementation without Iranian checklist.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
