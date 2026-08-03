# ADR-025 — State Management Strategy

| Field | Value |
| --- | --- |
| ID | ADR-025 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need client state for POS cart and server state for lists.

## Problem Statement

Putting server data only in Zustand duplicates bugs.

## Decision

Zustand for ephemeral UI/POS cart; TanStack Query for server state.

## Why This Decision / Rationale

Clear separation.

## Alternatives Considered

Redux everywhere; Context only.

## Tradeoffs

Two libraries.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Module pos/ui/state.

## Domain Impact

N/A

## Analytics Impact

Invalidate queries on realtime.

## Security Impact

Clear on logout.

## Implementation Requirements

All merchant UI ARDs.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-016

## Related ADRs

ADR-016

## Related Documents

docs/tech/zustand.md; tanstack-query.md

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

Clear on logout.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

URL state for deep links.

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
