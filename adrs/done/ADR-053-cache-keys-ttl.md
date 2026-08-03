# ADR-053 — Cache Key and TTL Standards

| Field | Value |
| --- | --- |
| ID | ADR-053 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need consistent keys.

## Problem Statement

Collisions and stale forever.

## Decision

Pattern mos:{env}:m:{merchantId}:{domain}:{resource}:{id}; TTL entity 300s, analytics 60s, storefront 600s.

## Why This Decision / Rationale

Operable caching.

## Alternatives Considered

Freeform keys.

## Tradeoffs

Short TTL more DB load.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Documented map in cache-strategy.

## Domain Impact

Membership/wallet keys include store.

## Analytics Impact

Dashboard caches 60s.

## Security Impact

Tenant in key.

## Implementation Requirements

Every cache usage.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-052

## Related ADRs

ADR-052

## Related Documents

cache-strategy.md

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

Tenant in key.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Per-entity overrides via ADR.

## Iranian User Experience Requirements

- **Persian localization impact:** Cached responses may include Persian strings; keys remain ID-based.
- **RTL requirements:** N/A visual RTL; do not corrupt Unicode in serializers.
- **Mobile usability impact:** TTLs and stampede controls keep mobile UX responsive.
- **Iranian business workflow impact:** OTP/rate limits tuned for Iranian SMS abuse patterns.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
