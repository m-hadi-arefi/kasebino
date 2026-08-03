# ADR-006 — Store Domain — Location Branding Slug

| Field | Value |
| --- | --- |
| ID | ADR-006 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Store is operational and customer-facing unit.

## Problem Statement

Missing geo/branding blocks pickup and store PWA.

## Decision

Store aggregate requires address+lat/lng, slug, branding, QR ref; one storefront surface per store.

## Why This Decision / Rationale

Enables pickup nav, QR, PWA manifests.

## Alternatives Considered

Merchant-only slug without store.

## Tradeoffs

Mandatory geo may slow onboarding UX.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

stores table columns; MinIO logos.

## Domain Impact

Store* events; StoreQrGenerated.

## Analytics Impact

StorefrontVisited attribution.

## Security Impact

Public location is intentional.

## Implementation Requirements

ARD-004, 032, 033.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-005

## Related ADRs

ADR-005

## Related Documents

store-location-architecture.md

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

Public location is intentional.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Multi-location analytics later.

## Iranian User Experience Requirements

- **Persian localization impact:** Store names, branding text, and geo labels are Persian-capable UTF-8.
- **RTL requirements:** Store settings UIs RTL; maps panels respect RTL chrome around map canvas.
- **Mobile usability impact:** Store setup usable on mobile; maps/navigation oriented to Iranian cities.
- **Iranian business workflow impact:** Physical store address + Jalali hours patterns for Iranian opening times.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
