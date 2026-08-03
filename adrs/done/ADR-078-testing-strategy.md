# ADR-078 — Testing Strategy

| Field | Value |
| --- | --- |
| ID | ADR-078 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Quality DoD.

## Problem Statement

No tests → regressions in POS money paths.

## Decision

Pyramid: many domain unit; integration use cases+DB; few e2e auth/POS/pickup; perf smoke barcode/checkout; tenant isolation mandatory.

## Why This Decision / Rationale

Confidence.

## Alternatives Considered

Only e2e.

## Tradeoffs

Slower CI.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Vitest/Jest + Playwright planned.

## Domain Impact

Invariants tested.

## Analytics Impact

N/A

## Security Impact

AuthZ tests.

## Implementation Requirements

testing-rules.md.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-002, ADR-029

## Related ADRs

ADR-002, ADR-029

## Related Documents

docs/testing/strategy.md

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

AuthZ tests.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Contract tests for events.

## Iranian User Experience Requirements

- **Persian localization impact:** Tests cover Persian strings for critical paths; fixtures include Persian names.
- **RTL requirements:** RTL/layout tests or screenshots for primary shells where feasible.
- **Mobile usability impact:** E2E on mobile viewports.
- **Iranian business workflow impact:** Format tests for تومان and Jalali helpers.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
