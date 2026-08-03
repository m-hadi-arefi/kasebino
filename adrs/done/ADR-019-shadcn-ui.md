# ADR-019 — shadcn/ui Strategy

| Field | Value |
| --- | --- |
| ID | ADR-019 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need accessible components owned in repo.

## Problem Statement

Heavy design systems slow MVP.

## Decision

shadcn/ui + Radix copied into src/shared/ui; customize via tokens.

## Why This Decision / Rationale

A11y + ownership.

## Alternatives Considered

MUI; Chakra; custom from scratch.

## Tradeoffs

Must keep upstream merges manual.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

CLI generate components.

## Domain Impact

N/A

## Analytics Impact

N/A

## Security Impact

Keep focus management.

## Implementation Requirements

ARD UI work.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-018

## Related ADRs

ADR-018

## Related Documents

docs/tech/shadcn-ui.md

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

Keep focus management.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Design system evolution ADR.

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
