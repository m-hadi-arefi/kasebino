# ADR-088 — Merchant Dashboard Architecture

| Field | Value |
| --- | --- |
| ID | ADR-088 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Daily home for merchants.

## Problem Statement

No retention pulse.

## Decision

Merchant shell with overview widgets from OLTP analytics APIs; mobile-first; uiuxpromax.

## Why This Decision / Rationale

Activation retention.

## Alternatives Considered

Desktop-only BI.

## Tradeoffs

N/A

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

ARD-013.

## Domain Impact

North Star visible.

## Analytics Impact

DashboardWidgetViewed.

## Security Impact

Auth merchant only.

## Implementation Requirements

ARD-013/016.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-063, ADR-016, ADR-021

## Related ADRs

ADR-063, ADR-016, ADR-021

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

Auth merchant only.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Custom reports.

## Iranian User Experience Requirements

- **Persian localization impact:** Dashboard chrome, KPIs, and empty states Persian.
- **RTL requirements:** Full RTL dashboards; mirrored nav.
- **Mobile usability impact:** Merchant KPIs readable on phone; customer dashboard PWA-first.
- **Iranian business workflow impact:** KPIs use تومان and Jalali ranges.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
