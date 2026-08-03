# ADR-018 — Frontend Component Architecture

| Field | Value |
| --- | --- |
| ID | ADR-018 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need consistent UI ownership.

## Problem Statement

God components with DB access.

## Decision

shared/ui primitives; module ui compositions; no domain imports in client components.

## Why This Decision / Rationale

DDD-friendly UI.

## Alternatives Considered

Feature-sliced only without modules.

## Tradeoffs

Discipline required.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Matches uiux component-library.

## Domain Impact

N/A

## Analytics Impact

FeatureUsed on key CTAs.

## Security Impact

No secrets in client bundles.

## Implementation Requirements

uiuxpromax before new UI.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-016, ADR-019

## Related ADRs

ADR-016, ADR-019

## Related Documents

docs/uiux/component-library.md

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

No secrets in client bundles.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Storybook optional.

## Iranian User Experience Requirements

- **Persian localization impact:** Design system tokens include Persian typography; components accept Persian strings without clipping.
- **RTL requirements:** shadcn/Tailwind configured RTL-first; logical properties mandatory in component primitives.
- **Mobile usability impact:** Touch density variants for POS vs analytical screens.
- **Iranian business workflow impact:** Components avoid Western-only date/currency subcomponents without Iranian adapters.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
