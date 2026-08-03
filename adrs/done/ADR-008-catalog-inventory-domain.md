# ADR-008 — Catalog and Inventory Domain

| Field | Value |
| --- | --- |
| ID | ADR-008 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

POS and storefront need products and stock.

## Problem Statement

Coupling price and stock incorrectly causes oversell.

## Decision

Catalog owns Product; Inventory owns StockItem per store; barcode unique per merchant.

## Why This Decision / Rationale

POS hot path clarity.

## Alternatives Considered

Single product-stock table blob.

## Tradeoffs

Two writes on sale.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Indexes per indexing-strategy.

## Domain Impact

InventoryChanged events.

## Analytics Impact

Low stock analytics.

## Security Impact

Audit stock adjusts.

## Implementation Requirements

ARD-005, 006.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-006

## Related ADRs

ADR-006

## Related Documents

domain-model.md

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

Audit stock adjusts.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Reservations for pickup.

## Iranian User Experience Requirements

- **Persian localization impact:** Product titles/descriptions store Persian; barcode UX supports local labeling habits.
- **RTL requirements:** Catalog tables and stock screens RTL with logical columns.
- **Mobile usability impact:** Scan + rapid stock adjustment on handheld devices.
- **Iranian business workflow impact:** Inventory language matches shop-floor vocabulary, not ERP jargon.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
