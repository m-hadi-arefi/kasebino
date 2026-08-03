# ADR-086 — Storefront Architecture

| Field | Value |
| --- | --- |
| ID | ADR-086 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Customer acquisition surface.

## Problem Statement

Ambiguous multi-merchant pages.

## Decision

Dedicated per-store storefront at path URL `/s/{storeSlug}` (ADR-091); catalog/PDP/info/static-map+nav; pickup checkout entry; branding; no marketplace; no subdomain requirement in MVP.

## Why This Decision / Rationale

Store ownership.

## Alternatives Considered

Shared mall UX.

## Tradeoffs

N/A

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Public routes cache 600s.

## Domain Impact

StorefrontVisited.

## Analytics Impact

Funnel events.

## Security Impact

Public rate limits.

## Implementation Requirements

ARD-010.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-006, ADR-016, ADR-082

## Related ADRs

ADR-006, ADR-016, ADR-082

## Related Documents

storefront-pwa-architecture.md

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

Public rate limits.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

A/B banners later.

## Iranian User Experience Requirements

- **Persian localization impact:** Storefront and store PWA fully Persian; SEO title/description Persian.
- **RTL requirements:** Customer experience RTL end-to-end including install prompts.
- **Mobile usability impact:** Lightweight assets for Iranian mobile data; home-screen install UX.
- **Iranian business workflow impact:** QR → PWA → membership/pickup loops matching local shop behavior.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
