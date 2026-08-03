# ADR-052 — Cache-Aside Read Strategy

| Field | Value |
| --- | --- |
| ID | ADR-052 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Hot reads: products, wallets, storefront.

## Problem Statement

Write-through complexity.

## Decision

Cache-aside default: miss→PG→set TTL→return.

## Why This Decision / Rationale

Simple + correct SoT.

## Alternatives Considered

Write-through default.

## Tradeoffs

Stampede risk—optional single-flight.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Application cache helpers.

## Domain Impact

Entity reads.

## Analytics Impact

Analytics 60s class.

## Security Impact

No PII in key names beyond hashed phone if needed.

## Implementation Requirements

cache-strategy.md.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-051

## Related ADRs

ADR-051

## Related Documents

07-cache-architecture.md

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

No PII in key names beyond hashed phone if needed.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Read-through framework avoid.

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
