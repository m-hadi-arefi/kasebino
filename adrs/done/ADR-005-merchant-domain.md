# ADR-005 — Merchant Domain

| Field | Value |
| --- | --- |
| ID | ADR-005 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Merchants are tenants and paying customers.

## Problem Statement

Need clear lifecycle draft→active→suspended.

## Decision

Merchant aggregate owns slug-adjacent identity of business; activation gates POS/storefront. **MVP includes full multi-store** under one merchant (ADR-091): each store isolated for inventory, branding, QR, storefront PWA, and membership wallets; merchant UI must switch/manage stores.

## Why This Decision / Rationale

Multi-tenant root.

## Alternatives Considered

User=merchant conflation.

## Tradeoffs

Multi-store under merchant increases modeling.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Tables merchants, settings; events Merchant*.

## Domain Impact

AUTH-06 may create merchant on register.

## Analytics Impact

Activation funnel metrics.

## Security Impact

Admin suspend audited.

## Implementation Requirements

ARD-003.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-003

## Related ADRs

ADR-003

## Related Documents

ARD-003

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

Admin suspend audited.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Plans/billing later.

## Iranian User Experience Requirements

- **Persian localization impact:** Merchant onboarding and profile fields support Persian trade names and contact copy.
- **RTL requirements:** Merchant admin shells are RTL.
- **Mobile usability impact:** Onboarding flows must work on merchant phones.
- **Iranian business workflow impact:** Assume Iranian business registration/contact habits; phone-centric identity.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
