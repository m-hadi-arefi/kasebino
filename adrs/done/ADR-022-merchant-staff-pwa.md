# ADR-022 — Merchant Staff PWA Architecture

| Field | Value |
| --- | --- |
| ID | ADR-022 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Staff need installable POS.

## Problem Statement

Conflating with store PWA confuses users.

## Decision

Separate staff PWA for POS/offline queue (ARD-017); MerchantOS branding.

## Why This Decision / Rationale

Peak-hour reliability.

## Alternatives Considered

One PWA for everyone.

## Tradeoffs

Two manifests to maintain.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

SW + IDB sale queue.

## Domain Impact

N/A

## Analytics Impact

AppOpened source=staff-pwa.

## Security Impact

httpOnly cookies; isolate from customer.

## Implementation Requirements

ARD-017.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-016, ADR-024

## Related ADRs

ADR-016, ADR-024

## Related Documents

13-pwa-architecture.md

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

httpOnly cookies; isolate from customer.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Push notifications later.

## Iranian User Experience Requirements

- **Persian localization impact:** Staff PWA strings Persian; offline banners Persian.
- **RTL requirements:** RTL shell separate from customer store PWA.
- **Mobile usability impact:** Installability and offline queue UX for low-connectivity shops.
- **Iranian business workflow impact:** Cashier workflows: barcode, phone, totaling in تومان.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
