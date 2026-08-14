# ADR-150: Database Migration Hygiene and Integrity Hardening

| Field | Value |
| --- | --- |
| ID | ADR-150 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | `docs/audit/database-status.md` |
| Folder | `adrs/done/` |

## Status

Accepted — Completed on 2026-08-12.

## Context

OLTP schema stubs and migrations `0000`–`0008` needed verification to ensure schema-drift protection and Drizzle Kit integrity (`db:check`). Handled coupons table drop in ADR-145.

## Current State

- Migrations: `0000`–`0008` in `src/infrastructure/database/migrations/` with valid `_journal.json`.
- Drift check: `npm run db:check` (`drizzle-kit check`) verified 100% green.
- CI gate: `db:check` step verified in `.github/workflows/ci.yml`.
- Integrity Strategy: App-level foreign key / tenant isolation enforced with unit & integration tests; soft-delete aware schema evolution (expand/contract).

## Decision

1. Verified `drizzle-kit check` passes cleanly on current schema stubs.
2. Verified `coupons` table dropped cleanly in migration `0007_drop_coupons.sql`.
3. Verified expand/contract forward-only migration rules in `src/infrastructure/database/migrations/README.md`.

## Scope

Included:

- Drizzle Kit journal and migration file alignment
- `npm run db:check` passing green
- CI schema-drift check validation
- Integration tests asserting migration integrity

Excluded:

- Full database RLS (separate future ADR)
- Rewriting historical migration files

## Acceptance Criteria Verified

- [x] `drizzle-kit check` (`npm run db:check`) passes
- [x] CI runs `db:check`
- [x] Coupons removed without leaving orphan stubs
- [x] Integrity strategy documented and tested
