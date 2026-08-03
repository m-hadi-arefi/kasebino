# ADR-004 — Modular Monolith Strategy

| Field | Value |
| --- | --- |
| ID | ADR-004 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Small team; MVP speed; extraction later.

## Problem Statement

Premature microservices increase ops without product-market fit.

## Decision

Phase 1 modular monolith (Next.js); module boundaries + outbox for future extraction.

## Why This Decision / Rationale

Fast iteration + horizontal scale of stateless app.

## Alternatives Considered

Microservices now; serverless-only.

## Tradeoffs

Deploy unit is whole app.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Single deployable; workers share codebase.

## Domain Impact

No cross-module DB joins in domain services.

## Analytics Impact

One outbox feeds many consumers.

## Security Impact

Shared security middleware.

## Implementation Requirements

ARD-001 scaffolds modules.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-001, ADR-002, ADR-003

## Related ADRs

ADR-001, ADR-002, ADR-003

## Related Documents

docs/architecture/20-future-microservice-extraction.md

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

Shared security middleware.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Extraction order in ADR-071+ / doc 20.

## Iranian User Experience Requirements

- **Persian localization impact:** Module UIs and API messages share a Persian i18n strategy at app shell.
- **RTL requirements:** Shared layout/providers enforce RTL once for all modules.
- **Mobile usability impact:** Single deployable must remain light enough for mobile networks.
- **Iranian business workflow impact:** Modules prioritize POS + storefront Iranian workflows before Western SaaS extras.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
