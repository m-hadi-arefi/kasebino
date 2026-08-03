# ADR-079 — Unit Integration E2E Performance Testing

| Field | Value |
| --- | --- |
| ID | ADR-079 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need layer guidance.

## Problem Statement

Wrong layer tests expensive.

## Decision

Unit domain without DB; integration Testcontainers/Compose; e2e critical journeys; perf harness for barcode/checkout budgets.

## Why This Decision / Rationale

Efficient coverage.

## Alternatives Considered

Manual only.

## Tradeoffs

Env flakiness—stabilize.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

CI jobs.

## Domain Impact

CompleteSale covered.

## Analytics Impact

N/A

## Security Impact

N/A

## Implementation Requirements

Each ARD test matrix.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-078

## Related ADRs

ADR-078

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

N/A

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Chaos tests later.

## Iranian User Experience Requirements

- **Persian localization impact:** Tests cover Persian strings for critical paths; fixtures include Persian names.
- **RTL requirements:** RTL/layout tests or screenshots for primary shells where feasible.
- **Mobile usability impact:** E2E on mobile viewports.
- **Iranian business workflow impact:** Format tests for تومان and Jalali helpers.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [ ] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [ ] Decision reflected in code and docs
- [ ] Dependent ADRs unblocked as needed
- [ ] Tests/validation for impacted areas green
- [ ] `adrs/STATUS.md` marked `completed`
