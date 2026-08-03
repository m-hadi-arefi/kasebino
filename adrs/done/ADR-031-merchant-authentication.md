# ADR-031 — Merchant Authentication Architecture

| Field | Value |
| --- | --- |
| ID | ADR-031 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Merchants need passwordless access.

## Problem Statement

Email/password poor for shop owners.

## Decision

Phone OTP for merchant staff; JWT session; AUTH-* rules.

## Why This Decision / Rationale

Fits market.

## Alternatives Considered

Passwordless magic links email.

## Tradeoffs

SMS cost/reliability.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

identity module.

## Domain Impact

MerchantLoggedIn.

## Analytics Impact

Auth funnel.

## Security Impact

Rate limit OTP 3/min.

## Implementation Requirements

ARD-002.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-029, ADR-030

## Related ADRs

ADR-029, ADR-030

## Related Documents

09-authentication-architecture.md

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

Rate limit OTP 3/min.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

WebAuthn later.

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
