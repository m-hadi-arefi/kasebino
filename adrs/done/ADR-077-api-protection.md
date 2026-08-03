# ADR-077 — API Protection and Data Protection

| Field | Value |
| --- | --- |
| ID | ADR-077 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Public storefront + auth APIs.

## Problem Statement

Injection/scraping/IDOR.

## Decision

Zod validation; authZ; rate limits; CORS locked; no sensitive fields on public DTOs; soft-delete defaults.

## Why This Decision / Rationale

Hardening.

## Alternatives Considered

Trust client.

## Tradeoffs

False positives.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

ACL DTOs storefront.

## Domain Impact

N/A

## Analytics Impact

Abuse signals.

## Security Impact

Critical.

## Implementation Requirements

All public routes.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-076, ADR-030, ADR-055

## Related ADRs

ADR-076, ADR-030, ADR-055

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

Critical.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

WAF.

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
