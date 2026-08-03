# ADR-029 — Backend Clean Architecture Layering

| Field | Value |
| --- | --- |
| ID | ADR-029 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Next.js invites logic in routes.

## Problem Statement

Unmaintainable handlers.

## Decision

Routes/Server Actions → application use cases → domain ← infra (Drizzle/Mongo/EMQX/MinIO/SMS).

## Why This Decision / Rationale

Testable & extractable.

## Alternatives Considered

Fat controllers.

## Tradeoffs

More files.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Module layout mandatory.

## Domain Impact

Use cases define TX boundaries.

## Analytics Impact

Use cases emit analytics ports.

## Security Impact

AuthZ in application.

## Implementation Requirements

All backend ARDs.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-002, ADR-004, ADR-016

## Related ADRs

ADR-002, ADR-004, ADR-016

## Related Documents

architecture-rules.md

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

AuthZ in application.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

N/A

## Iranian User Experience Requirements

- **Persian localization impact:** Human-readable API messages Persian (or stable codes + Persian client maps).
- **RTL requirements:** N/A for internal JSON keys; document Persian message strategy.
- **Mobile usability impact:** Payload sizes and latency budgets respect mobile clients.
- **Iranian business workflow impact:** Rate-limit and auth errors user-safe in Persian.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
