# ADR-093 — Replace In-Memory Repositories with Drizzle Implementations

| Field | Value |
| --- | --- |
| ID | ADR-093 |
| Status | `Accepted` |
| Date | 2026-08-03 |
| Origin | Full repository audit (AUDIT_REPORT.md) |
| Folder | `adrs/done/` |

## Status

`Accepted` — Drizzle repository implementations landed 2026-08-05. See `adrs/STATUS.md`.

## Title

Replace In-Memory Repositories with Drizzle Implementations

## Context

All domain modules use in-memory repositories (~21 files). Domain use cases are real but not durable.

## Problem

MVP cannot survive process restart; no multi-instance consistency; no tenant isolation at persistence layer.

## Current State

in-memory-* repositories for merchant, store, identity, CRM, catalog, inventory, POS, loyalty, ordering, payments, admin, notifications, analytics projections. Zero Drizzle repository classes under modules.

## Desired State

Every MVP repository port has a Drizzle implementation under module infrastructure/persistence; in-memory retained only for unit tests.

## Requirements

- Drizzle repos for identity, merchant, store, membership, catalog, inventory, sales, loyalty, orders, payments, notifications, admin, outbox
- Soft-delete + createdAt/updatedAt honored (ADR-047)
- merchantId/storeId tenant filters on every query (ADR-048)
- Repository unit + integration tests against PostgreSQL

## Technical Design

Implement repository interfaces already defined in domain/repositories.ts using createDb() client. Wire DI composition root for App Router. Keep domain free of drizzle-orm imports.

## Acceptance Criteria

- [x] No production code path uses in-memory repos
- [x] Integration tests prove CRUD + isolation for each aggregate
- [x] Soft-deleted rows excluded from default lists

## Risks

- Transactional outbox must share DB transaction with mutations
- N+1 query regressions on POS paths

## Dependencies

- ADR-092
- ADR-029
- ADR-048

## Estimated Complexity

**L**

## Iranian User Experience Requirements

- Persian copy + RTL for all new user-facing surfaces.
- Jalali dates and تومان formatting where money/time shown.
- Iranian phone (09xxxxxxxxx) validation for identity flows.
- Obey `docs/rules/iranian-first-development.md` and `docs/checklists/iranian-feature-checklist.md`.

## Related Documents

- `AUDIT_REPORT.md`
- `PRD.md`
- `docs/ards/STATUS.md`

## Implementation notes (2026-08-05)

- `createProductionRepositories` + `assertProductionRepositoriesForbidInMemory`
- Drizzle repos under modules/*/infrastructure/persistence
- Integration tests against Compose Postgres (CRUD + tenant + soft-delete)
