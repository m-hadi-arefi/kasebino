# ADR-026 — Data Fetching Strategy

| Field | Value |
| --- | --- |
| ID | ADR-026 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

RSC + client fetch mix.

## Problem Statement

Waterfalls on POS.

## Decision

RSC for dashboards/marketing; client Query for interactive POS/CRM; Route Handlers for JSON public/mobile.

## Why This Decision / Rationale

Fits Next 15.

## Alternatives Considered

Client-only SPA.

## Tradeoffs

Cognitive load.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Avoid RSC waterfalls on POS.

## Domain Impact

N/A

## Analytics Impact

Track slow queries via OTel.

## Security Impact

Auth on fetches.

## Implementation Requirements

Per-surface guidelines in tech/nextjs.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-016, ADR-025

## Related ADRs

ADR-016, ADR-025

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

Auth on fetches.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Partial prerender later.

## Iranian User Experience Requirements

- **Persian localization impact:** Cached display state must preserve Unicode Persian payloads.
- **RTL requirements:** Suspense/error UI Persian RTL.
- **Mobile usability impact:** Prefer snappy mobile perceived performance over chatty fetches.
- **Iranian business workflow impact:** Stale-while-revalidate must not flash English placeholders.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
