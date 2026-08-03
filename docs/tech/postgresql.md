# PostgreSQL

## Purpose

System of record for all aggregates.

Mandatory access layer: **Drizzle ORM** (see `drizzle-orm.md`). No other ORM.

## Why chosen

Relational integrity for sales/inventory; mature ops.

## Best practices

- UUID PKs
- Soft deletes
- Tenant columns + indexes
- Migrations only via Drizzle Kit

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/infrastructure/database/schema/`
- `SQL migrations in src/infrastructure/database/migrations/`

## Anti-patterns

- App-level joins across unbounded tables without indexes
- Physical delete of auditable rows

## Performance recommendations

- Covering indexes for barcode & phone
- VACUUM/analyze in prod ops

## Security recommendations

- Least-privilege DB users
- No string-built SQL

## Example architecture usage

One DB; tenant row isolation.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
