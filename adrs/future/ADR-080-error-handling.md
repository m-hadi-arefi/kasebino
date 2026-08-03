# ADR-080 — Error Handling Strategy

| Field | Value |
| --- | --- |
| ID | ADR-080 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Failures everywhere.

## Problem Statement

Inconsistent errors.

## Decision

Domain errors mapped to stable API codes; never leak stacks in prod; log with correlationId; user-safe messages.

## Why This Decision / Rationale

Supportability.

## Alternatives Considered

Throw raw Error to client.

## Tradeoffs

Mapping tables.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Shared error module.

## Domain Impact

N/A

## Analytics Impact

Error rates.

## Security Impact

No secrets.

## Implementation Requirements

All APIs.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-030, ADR-074

## Related ADRs

ADR-030, ADR-074

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

No secrets.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Problem+JSON later.

## Iranian User Experience Requirements

- **Persian localization impact:** Validation and error copy Persian; map technical codes to plain language.
- **RTL requirements:** Form field order and error icons RTL-aware.
- **Mobile usability impact:** Inline errors visible above mobile keyboards.
- **Iranian business workflow impact:** Phone/OTP/price validators encode Iranian formats.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [ ] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [ ] Decision reflected in code and docs
- [ ] Dependent ADRs unblocked as needed
- [ ] Tests/validation for impacted areas green
- [ ] `adrs/STATUS.md` marked `completed`
