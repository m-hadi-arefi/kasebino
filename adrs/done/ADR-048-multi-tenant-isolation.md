# ADR-048 — Multi-Tenant Data Isolation

| Field | Value |
| --- | --- |
| ID | ADR-048 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Shared DB SaaS.

## Problem Statement

Cross-tenant leaks fatal.

## Decision

Shared schema row-level merchant_id; store_id where needed; repo filters from auth context; tests mandatory.

## Why This Decision / Rationale

Cost-effective isolation.

## Alternatives Considered

DB-per-tenant MVP.

## Tradeoffs

Noisy neighbor risk mitigated by indexes/pooling.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Every tenant table.

## Domain Impact

Membership store scope.

## Analytics Impact

Analytics tenant filters.

## Security Impact

Critical controls.

## Implementation Requirements

05-multi-tenant-strategy.md.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-041, ADR-034

## Related ADRs

ADR-041, ADR-034

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

Critical controls.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Schema-per-tenant unlikely.

## Iranian User Experience Requirements

- **Persian localization impact:** UTF-8 Persian text columns; search/indexing plans for Persian product/customer text; no ASCII-only collations.
- **RTL requirements:** N/A at SQL layer for visual RTL; presentation still RTL.
- **Mobile usability impact:** Query budgets protect POS mobile latency.
- **Iranian business workflow impact:** Tenant data models Iranian merchants/stores; barcode+name search for local catalogs.

### Global gate

Obey `docs/rules/iranian-first-development.md`. Feature incomplete until `docs/checklists/iranian-feature-checklist.md` passes for in-scope surfaces.

## Completion Criteria

- [x] Iranian First checklist passed (`docs/checklists/iranian-feature-checklist.md`) for in-scope UX
- [x] Decision reflected in code and docs
- [x] Dependent ADRs unblocked as needed
- [x] Tests/validation for impacted areas green
- [x] `adrs/STATUS.md` marked `completed`
