# ADR-012 — Payment Domain

| Field | Value |
| --- | --- |
| ID | ADR-012 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Pickup orders need digital payment path and fees.

## Problem Statement

PSP for Iran undecided.

## Decision

PaymentGateway port + sandbox adapter; OrderPaid/Refunded; webhook verification; concrete PSP via future ADR.

## Why This Decision / Rationale

Unblocks architecture without vendor lock-in.

## Alternatives Considered

Hardcode PSP now.

## Tradeoffs

Integration deferred risk.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

payments table; idempotency.

## Domain Impact

OrderPaid warehouse.

## Analytics Impact

Payment failure analytics.

## Security Impact

Webhook signatures.

## Implementation Requirements

ARD-012; docs/decisions ADR-0002.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-011

## Related ADRs

ADR-011

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

Webhook signatures.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Choose PSP ADR-084.

## Iranian User Experience Requirements

- **Persian localization impact:** Payment labels, failures, and receipts Persian; amounts in تومان formatting.
- **RTL requirements:** Checkout payment steps RTL.
- **Mobile usability impact:** Iranian PSP UX patterns; mobile browser/WebView friendly.
- **Iranian business workflow impact:** PSP ports for Iranian providers; no Stripe-as-default assumption.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
