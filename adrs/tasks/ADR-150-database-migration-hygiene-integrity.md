# ADR-150: Database Migration Hygiene and Integrity Hardening

| Field | Value |
| --- | --- |
| ID | ADR-150 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/database-status.md` |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

OLTP schema is largely wired, but hand-authored migrations `0003`/`0005` lack Drizzle meta snapshots; `coupons` is orphan; no SQL FKs/CHECK constraints. Future `drizzle-kit generate` risk and integrity bugs are app-only.

## Current State

- Migrations: `0000`–`0005` under `src/infrastructure/database/migrations/`
- Meta snapshots missing for `0003`, `0005`
- Orphan: `coupons` (coordinate with ADR-145)
- Schema index README forbids hand-authored SQL outside kit — already violated
- No `FOREIGN KEY` / RLS

## Decision

1. Restore Kit meta hygiene (generate/baseline snapshots so `db:check` passes).
2. Prefer expand/contract for new constraints.
3. Add selective SQL FKs only where safe (non-cyclic, soft-delete aware) **or** document permanent app-level integrity with stronger integration tests — choose FKs for child tables without soft-delete ambiguity first (`sale_lines→sales`, `order_lines→orders`).
4. Coordinate coupons drop/implement with ADR-145 before integrity pass.

## Scope

Included:

- Meta snapshot repair for 0003/0005
- `npm run db:check` green in CI
- Decision record: FKs subset vs tests-only
- Optional CHECKs for known status enums

Excluded:

- Full RLS (separate future ADR)
- Rewriting all historical migrations

## Technical Design

### Database

- Repair journal/snapshots via drizzle-kit workflow documented in migrations README
- Additive FK migrations after data audit

### Backend

- Integration tests asserting orphan prevention for critical parents

### CI

- Run `db:check` on PR

## Implementation Plan

1. Coupons decision (ADR-145) applied.
2. Snapshot hygiene PR.
3. FK/CHECK PR behind staging migrate.
4. CI gate.

## Data Model Changes

Tables: possibly drop coupons  
Fields: none  
Indexes: as needed for FK  
Relations: selected FKs

## API Changes

None

## Frontend Changes

None

## Testing Requirements

Unit: migrations.test expectations  
Integration: FK reject orphan insert  
CI: db:check

## Acceptance Criteria

- [ ] `drizzle-kit check` passes
- [ ] CI runs db:check
- [ ] Coupons not left as unexplained orphan
- [ ] Documented integrity strategy (FKs and/or tests)
- [ ] No broken deploys on migrate

## Dependencies

Required before: none  
Coordinate: ADR-145 coupons  
Blocks: safer schema evolution

## Migration / Rollout Plan

Staging migrate first; FKs only after orphan row cleanup queries.
