# ADR-027 — Form and Validation Strategy

| Field | Value |
| --- | --- |
| ID | ADR-027 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Forms everywhere.

## Problem Statement

Client-only validation insecure.

## Decision

React Hook Form + Zod; Zod also at API boundary.

## Why This Decision / Rationale

Type-safe UX + security.

## Alternatives Considered

Formik; yup only.

## Tradeoffs

Schema duplication risk—share where practical.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

zodResolver.

## Domain Impact

N/A

## Analytics Impact

N/A

## Security Impact

Never trust client alone.

## Implementation Requirements

All form UIs.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-016, ADR-019

## Related ADRs

ADR-016, ADR-019

## Related Documents

docs/tech/zod.md

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

Never trust client alone.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Persian validation/error messages are required now (Iranian First); do not defer fa-IR copy.

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
