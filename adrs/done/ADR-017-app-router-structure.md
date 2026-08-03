# ADR-017 — App Router Structure

| Field | Value |
| --- | --- |
| ID | ADR-017 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Multiple audiences: merchant, customer, admin, marketing.

## Problem Statement

Flat routes confuse auth.

## Decision

Route groups: (marketing), (merchant), (storefront)/s/[slug], (admin), api/v1.

## Why This Decision / Rationale

Clear auth boundaries.

## Alternatives Considered

Single group for all.

## Tradeoffs

More folders.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Middleware coarse gates.

## Domain Impact

N/A

## Analytics Impact

PageViewed by path.

## Security Impact

Separate cookie paths if needed.

## Implementation Requirements

Scaffold in ARD-001/010/018/029.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-016

## Related ADRs

ADR-016

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

Separate cookie paths if needed.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Default product shells are `lang=fa` `dir=rtl`; locale routing may evolve but Persian RTL is not deferred.

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
