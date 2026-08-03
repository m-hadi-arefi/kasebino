# ADR-030 — API Architecture and Standards

| Field | Value |
| --- | --- |
| ID | ADR-030 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Many clients: web staff, storefront, future mobile.

## Problem Statement

Inconsistent errors/auth break clients.

## Decision

/api/v1 JSON; Zod validate; error envelope with correlationId; Idempotency-Key for sale/order.

## Why This Decision / Rationale

Stability.

## Alternatives Considered

tRPC only; GraphQL now.

## Tradeoffs

Versioning overhead.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Document in each ARD.

## Domain Impact

N/A

## Analytics Impact

API metrics.

## Security Impact

Rate limits; no OTP in prod.

## Implementation Requirements

api-rules.md.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-029

## Related ADRs

ADR-029

## Related Documents

15-api-architecture.md

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

Rate limits; no OTP in prod.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

OpenAPI generate later.

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
