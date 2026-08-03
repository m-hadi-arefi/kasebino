# ADR-028 — Frontend Error Handling UX

| Field | Value |
| --- | --- |
| ID | ADR-028 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Network/validation failures common.

## Problem Statement

Silent failures destroy trust at POS.

## Decision

Typed error envelope toasts/inline; recovery paths for barcode miss; optimistic UI only where safe.

## Why This Decision / Rationale

Operability.

## Alternatives Considered

Alert() spam.

## Tradeoffs

Design effort.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

correlationId shown to support optionally.

## Domain Impact

N/A

## Analytics Impact

Error events sampled.

## Security Impact

No OTP in errors.

## Implementation Requirements

UI rules.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-018, ADR-021

## Related ADRs

ADR-018, ADR-021

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

No OTP in errors.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Offline banners staff PWA.

## Iranian User Experience Requirements

- **Persian localization impact:** Validation and error copy Persian; map technical codes to plain language.
- **RTL requirements:** Form field order and error icons RTL-aware.
- **Mobile usability impact:** Inline errors visible above mobile keyboards.
- **Iranian business workflow impact:** Phone/OTP/price validators encode Iranian formats.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
