# ADR-076 — Security Architecture

| Field | Value |
| --- | --- |
| ID | ADR-076 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Multi-tenant + payments + PII phones.

## Problem Statement

Under-specified security.

## Decision

HTTPS, secure cookies, Zod, parameterized SQL, CSRF/XSS protections, tenant guards, audit, rate limits—as 06-security-architecture.

## Why This Decision / Rationale

Baseline trust.

## Alternatives Considered

Security later.

## Tradeoffs

Ongoing cost.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Checklist on ARD Done.

## Domain Impact

PII minimization.

## Analytics Impact

Security monitoring.

## Security Impact

Core of ADR.

## Implementation Requirements

ARD-020 pen smoke.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-034, ADR-055, ADR-058

## Related ADRs

ADR-034, ADR-055, ADR-058

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

Core of ADR.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Pentest vendor.

## Iranian User Experience Requirements

- **Persian localization impact:** Security warnings to users Persian; avoid scary English-only blocks.
- **RTL requirements:** Security settings pages RTL.
- **Mobile usability impact:** Auth challenges mobile-friendly.
- **Iranian business workflow impact:** Threat model includes SMS OTP abuse common in local markets.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
