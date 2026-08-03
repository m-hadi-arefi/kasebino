# ADR-047 — Data Integrity Soft Delete and Audit Fields

| Field | Value |
| --- | --- |
| ID | ADR-047 |
| Status | `Accepted` |
| Date | 2026-08-03 |

## Status

`Accepted` — Implementation tracking: see `adrs/STATUS.md`.

## Context

Compliance and undo.

## Problem Statement

Hard deletes lose history.

## Decision

Soft delete deleted_at; created_at/updated_at mandatory; audit_logs/Mongo audit for sensitive; optimistic version where needed.

## Why This Decision / Rationale

NFR-10.

## Alternatives Considered

Hard delete always.

## Tradeoffs

Table bloat—purge jobs later.

## Consequences

- Binding for all implementation via ard-to-code.
- Related docs must stay consistent with this ADR.
- Violations require a superseding ADR.

## Technical Impact

Partial uniques.

## Domain Impact

Supports CRM restore stories.

## Analytics Impact

N/A

## Security Impact

Audit evidence.

## Implementation Requirements

All tables.

## Technical Specifications

See linked architecture/tech documents. Enforce TypeScript strict, Drizzle-only SQL ORM (where SQL), Mongo only for analytics plane, pickup-only MVP, store-first membership.

## Dependencies

**Prerequisites:** ADR-043

## Related ADRs

ADR-043

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

Audit evidence.

## Performance Considerations

Honor NFR POS/search/storefront budgets; cache-aside; no analytics on checkout critical path.

## Future Evolution

Purge policies ADR retention.

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
