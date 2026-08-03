# ADR-034 — Authorization RBAC Model

| Field | Value |
| --- | --- |
| ID | ADR-034 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Multiple roles.

## Problem Statement

IDOR/tenant leaks.

## Decision

RBAC: merchant_owner, store_employee, customer, platform_admin; every query tenant/store scoped.

## Why This Decision / Rationale

Least privilege.

## Alternatives Considered

ABAC full; everyone owner.

## Tradeoffs

Role matrix docs needed.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Checks in application services.

## Domain Impact

Denied access audit.

## Analytics Impact

AuthZ deny metrics.

## Security Impact

Critical.

## Implementation Requirements

Tests mandatory each resource.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-033

## Related ADRs

ADR-033

## Related Documents

06-security-architecture.md

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

Attribute policies later.

## Iranian User Experience Requirements

- **Persian localization impact:** Auth screens and SMS OTP templates Persian; Iranian MSISDN validation.
- **RTL requirements:** Login/OTP layouts RTL; numeral entry friendly.
- **Mobile usability impact:** SMS reliability and short Persian OTP messages; mobile-first.
- **Iranian business workflow impact:** Shopkeeper and customer login via phone OTP norms in Iran.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
