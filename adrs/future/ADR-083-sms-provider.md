# ADR-083 — SMS Provider Selection Iran

| Field | Value |
| --- | --- |
| ID | ADR-083 |
| Status | `Proposed` |
| Date | 2026-08-03 |

## Status

`Proposed` — Implementation tracking: see `adrs/STATUS.md`.

## Context

OTP requires SMS in Iran.

## Problem Statement

Provider cost/reliability unknown.

## Decision

Keep SmsSender port; choose provider via this ADR when data available; console/dev adapter until then.

## Why This Decision / Rationale

Avoid lock-in.

## Alternatives Considered

Hardcode provider now.

## Tradeoffs

Prod blocked until chosen.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Adapter pattern.

## Domain Impact

N/A

## Analytics Impact

Delivery rate metrics.

## Security Impact

Sender ID compliance.

## Implementation Requirements

Unblocks AUTH prod.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-031, ADR-032

## Related ADRs

ADR-031, ADR-032

## Related Documents

docs/decisions/ADR-0001

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

Sender ID compliance.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Accept when vendor picked.

## Iranian User Experience Requirements

- **Persian localization impact:** Auth screens and SMS OTP templates Persian; Iranian MSISDN validation.
- **RTL requirements:** Login/OTP layouts RTL; numeral entry friendly.
- **Mobile usability impact:** SMS reliability and short Persian OTP messages; mobile-first.
- **Iranian business workflow impact:** Shopkeeper and customer login via phone OTP norms in Iran.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [ ] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [ ] Decision reflected in code and docs
- [ ] Dependent ADRs unblocked as needed
- [ ] Tests/validation for impacted areas green
- [ ] `adrs/STATUS.md` marked `completed`
