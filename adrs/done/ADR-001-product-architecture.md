# ADR-001 — Product Architecture — Store-First Retention OS

| Field | Value |
| --- | --- |
| ID | ADR-001 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

MerchantOS retains customers for local retail via POS identity capture, loyalty, storefront, and store PWA.

## Problem Statement

Need a single product architecture aligning POS, membership, storefront, pickup, and analytics without becoming ERP/marketplace.

## Decision

Adopt store-first Customer Retention OS: each store owns POS, inventory, CRM/memberships, loyalty, storefront URL/QR/branding, installable store PWA; online fulfillment is pickup-only in MVP.

## Why This Decision / Rationale

Matches PRD core insight; maximizes merchant-owned relationships; avoids marketplace/delivery complexity.

## Alternatives Considered

Marketplace model; delivery-first commerce; accounting-centric POS.

## Tradeoffs

Less horizontal marketplace GMV; sharper local retention focus.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Guides all modules, ARDs 001–035, dual data planes PG+Mongo.

## Domain Impact

StoreMembership, pickup Order, Store branding/geo become first-class.

## Analytics Impact

Instrument activation, QR, PWA, loyalty loops.

## Security Impact

Tenant isolation; no cross-merchant browsing.

## Implementation Requirements

Implement per ADR roadmap; map to ARDs.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** None

## Related ADRs

—

## Related Documents

PRD.md; docs/product/store-first-evolution.md

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

Tenant isolation; no cross-merchant browsing.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Delivery/marketplace only via new ADRs.

## Iranian User Experience Requirements

- **Persian localization impact:** Product vision and UX copy default to Persian for merchants and customers; English docs only for engineering.
- **RTL requirements:** All primary product surfaces are RTL-first compositions.
- **Mobile usability impact:** MVP optimized for Iranian Android retailers and shoppers.
- **Iranian business workflow impact:** Retention loops assume SMS, QR stickers, in-store pickup, and traditional shopkeeper cognition.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
