# ADR-009 — POS and Sales Domain

| Field | Value |
| --- | --- |
| ID | ADR-009 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Retention starts at POS.

## Problem Statement

Slow checkout kills adoption.

## Decision

Sale aggregate CompleteSale UoW: lines, membership upsert, stock, loyalty, receipt, outbox; <5s budget; phone required; tender type recorded as `cash` | `card_terminal` | `mixed` (ADR-091). Card-acquiring integration out of MVP.

## Why This Decision / Rationale

Core North Star driver.

## Alternatives Considered

Anonymous cash drawer only.

## Tradeoffs

Mandatory phone UX friction mitigated by keypad design.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Idempotency-Key; Drizzle TX.

## Domain Impact

SaleCompleted events.

## Analytics Impact

Checkout timings product analytics.

## Security Impact

Audit cancels.

## Implementation Requirements

ARD-007.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-007, ADR-008

## Related ADRs

ADR-007, ADR-008

## Related Documents

PRD POS-*

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

Audit cancels.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Offline sync ADR-024 staff PWA.

## Iranian User Experience Requirements

- **Persian localization impact:** POS Chrome, keypad hints, and errors entirely Persian.
- **RTL requirements:** RTL POS layout with large tap targets; scanner feedback clear in RTL.
- **Mobile usability impact:** Critical path under 3s culture; offline-friendly staff PWA on cheap Androids.
- **Iranian business workflow impact:** Phone capture at checkout must feel natural for Iranian cashiers under rush.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
