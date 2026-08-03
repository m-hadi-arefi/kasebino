# ADR-084 — Payment PSP Selection

| Field | Value |
| --- | --- |
| ID | ADR-084 |
| Status | `Proposed` |
| Date | 2026-08-03 |

## Status

`Proposed` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Need real rails for OrderPaid.

## Problem Statement

PSP undecided.

## Decision

PaymentGateway port + sandbox; select PSP in this ADR later.

## Why This Decision / Rationale

Architecture proceeds.

## Alternatives Considered

Build custom acquirer.

## Tradeoffs

Go-live dependency.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Webhook verify.

## Domain Impact

OrderPaid.

## Analytics Impact

Payment success rates.

## Security Impact

PCI scope minimize.

## Implementation Requirements

ARD-012.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-012

## Related ADRs

ADR-012

## Related Documents

docs/decisions/ADR-0002

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

PCI scope minimize.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Multi-PSP.

## Iranian User Experience Requirements

- **Persian localization impact:** Payment labels, failures, and receipts Persian; amounts in تومان formatting.
- **RTL requirements:** Checkout payment steps RTL.
- **Mobile usability impact:** Iranian PSP UX patterns; mobile browser/WebView friendly.
- **Iranian business workflow impact:** PSP ports for Iranian providers; no Stripe-as-default assumption.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [ ] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [ ] Decision reflected in code and docs
- [ ] Dependent ADRs unblocked as needed
- [ ] Tests/validation for impacted areas green
- [ ] `adrs/STATUS.md` marked `completed`
