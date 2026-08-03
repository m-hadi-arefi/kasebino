# ADR-054 — Cache Invalidation via Domain Events

| Field | Value |
| --- | --- |
| ID | ADR-054 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Mutations must not leave wrong prices/stock.

## Problem Statement

TTL-only too stale for POS.

## Decision

Mutations emit events; CacheInvalidationService deletes keys; next read rebuilds.

## Why This Decision / Rationale

Event-driven freshness.

## Alternatives Considered

Manual expire in every handler only.

## Tradeoffs

Must keep key maps updated.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Subscriber in-process + reliable via outbox side effects.

## Domain Impact

Product/Sale/Order/Membership events.

## Analytics Impact

N/A

## Security Impact

N/A

## Implementation Requirements

event-catalog invalidation columns.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-052, ADR-036

## Related ADRs

ADR-052, ADR-036

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

N/A

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Versioned cache keys later.

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
