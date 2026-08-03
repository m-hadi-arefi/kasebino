# ADR-016 — Next.js Application Architecture

| Field | Value |
| --- | --- |
| ID | ADR-016 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need unified TS full-stack.

## Problem Statement

Separate Nest+React doubles work.

## Decision

Next.js 15+ App Router hosts UI, Route Handlers, Server Actions in modular monolith.

## Why This Decision / Rationale

One repo velocity; RSC for dashboards.

## Alternatives Considered

Remix; separate API gateway only.

## Tradeoffs

Couple deploy of UI+API.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

app/ routes compose modules.

## Domain Impact

Presentation layer only calls application.

## Analytics Impact

correlationId middleware.

## Security Impact

Secure cookies.

## Implementation Requirements

ARD-001.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-004

## Related ADRs

ADR-004

## Related Documents

docs/tech/nextjs.md

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

Secure cookies.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Edge later.

## Iranian User Experience Requirements

- **Persian localization impact:** App Router default locale/presentation is Persian; metadata for storefront Persian SEO.
- **RTL requirements:** `html`/`body` defaults `lang=fa` `dir=rtl` for merchant/customer apps.
- **Mobile usability impact:** Route segments and loading UX tuned for mobile networks.
- **Iranian business workflow impact:** Server/client boundaries must not leak English-only flash of unstyled LTR.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
