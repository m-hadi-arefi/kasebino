# ADR-021 — uiuxpromax Mandatory for UI

| Field | Value |
| --- | --- |
| ID | ADR-021 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

AI UI quality variance.

## Problem Statement

Inconsistent UX breaks POS speed and brand.

## Decision

Every UI task invokes uiuxpromax before code; failure = not Done.

## Why This Decision / Rationale

Enforces design system.

## Alternatives Considered

Freeform AI UI.

## Tradeoffs

Dependency on skill availability.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Skill gate in ard-to-code.

## Domain Impact

N/A

## Analytics Impact

N/A

## Security Impact

A11y from design-rules.

## Implementation Requirements

Stop if skill missing.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-018, ADR-020

## Related ADRs

ADR-018, ADR-020

## Related Documents

docs/skills/uiuxpromax-integration.md

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

A11y from design-rules.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Replace only via ADR.

## Iranian User Experience Requirements

- **Persian localization impact:** uiuxpromax briefs must require Persian copy samples and fa-IR persona.
- **RTL requirements:** Generated designs must be RTL compositions before coding.
- **Mobile usability impact:** Mockups at 390px Android widths for merchant/customer journeys.
- **Iranian business workflow impact:** Prompts must describe Iranian retail contexts (مغازه، صندوقدار، مشتری).

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
