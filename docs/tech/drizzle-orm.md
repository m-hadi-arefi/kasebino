# Why Drizzle

Drizzle ORM is the **only approved ORM** for MerchantOS. Database architecture comes first; Drizzle schemas follow that architecture — never the reverse.

## Type Safety

- End-to-end TypeScript inference from schema → queries → results
- Compile-time catch of column/relation mistakes
- Aligns with project TypeScript strict mode

## SQL-first approach

- Queries map closely to SQL mental model
- Explicit joins, projections, and `WHERE` clauses
- Easier for senior DB design review than opaque query builders

## Performance

- Thin abstraction over `postgres.js` / `node-postgres`
- Minimal overhead vs handwritten SQL
- Full control of selected columns (no accidental over-fetch)

## Better control

- Explicit index and constraint definitions in schema/migrations
- Transactions and isolation levels under application control
- Compatible with query-first index design

## Migration management

- **Drizzle Kit** versioned SQL migrations
- Forward-only, reviewable migration files
- Production-safe expand/contract workflows

## PostgreSQL optimization

- Native support for PostgreSQL types, indexes, partial indexes, JSONB
- Composite unique/index definitions match our multi-tenant keys
- Does not hide PostgreSQL features behind lowest-common-denominator ORM

## DDD compatibility

- Schema and client live in **infrastructure** only
- Domain repositories are interfaces; Drizzle implements them
- Domain layer never imports `drizzle-orm` or schema tables

# Project Standards

- **Drizzle ORM is mandatory** (latest stable).
- **No alternative ORM** — Prisma, TypeORM, Sequelize, MikroORM, Objection, or others are forbidden.
- **No raw SQL** except inside approved infrastructure repositories (or typed `sql` fragments reviewed in ARD).
- **Repository pattern required** for all aggregate persistence.
- **Domain layer must never depend directly on Drizzle.**
- Design tables/indexes/query paths first (`docs/architecture/database-architecture.md` family), then encode in Drizzle schema.

# Folder Structure

```
src/
  modules/
    <context>/
      domain/
        repositories/          # interfaces only
      application/
      infrastructure/
        persistence/           # Drizzle repository implementations (optional colocated)
  shared/
  infrastructure/
    database/
      schema/                  # one file (or folder) per bounded context
        identity.ts
        merchant.ts
        catalog.ts
        ...
        index.ts               # re-exports
      migrations/              # Drizzle Kit output (versioned SQL)
      repositories/            # shared/cross-cutting repos if any
      drizzle/
        client.ts              # db client singleton/factory
        config.ts              # drizzle.config.ts mirrored docs
```

Module-owned repository implementations may live under `src/modules/<context>/infrastructure/persistence/` while **schema definitions remain centralized** under `src/infrastructure/database/schema/` for migration cohesion.

# Schema Strategy

- One schema module per bounded context
- Strong typing for all columns
- Explicit relations (`relations()`) where joins are needed
- UUID primary keys (`uuid` / `gen_random_uuid()`)
- Soft delete: `deletedAt` nullable timestamp where applicable
- Audit fields: `createdAt`, `updatedAt`; sensitive tables link to `audit_logs`
- Tenant column: `merchantId` on tenant-owned tables
- Optimistic locking: `version` integer where concurrency matters (inventory, wallet, sales sync)

# Migration Strategy

- Tool: **Drizzle Kit**
- Versioned SQL under `src/infrastructure/database/migrations/`
- **Forward-only** in production (no destructive down migrations on prod)
- Process:
  1. Update design docs / ARD Database Design
  2. Update Drizzle schema
  3. `drizzle-kit generate`
  4. Human/AI review SQL (indexes, locks, NOT NULL backfills)
  5. Apply in CI/staging via migrate job before traffic
  6. Expand/contract for breaking changes

# Query Strategy

| Concern | Standard |
| --- | --- |
| Select optimization | Project only needed columns |
| Pagination | Keyset preferred on hot lists; offset OK for admin small pages |
| Filtering | Always include `merchantId` (+ `deletedAt IS NULL` default) |
| Aggregations | Prefer projection tables / materialized summaries for dashboards |
| Transactions | Multi-aggregate writes in single DB transaction |
| Bulk operations | Batched inserts/updates; avoid row-by-row in loops |

See `docs/architecture/query-strategy.md`.

# Performance Rules

- Avoid N+1 — use joins or explicit batch `inArray` loads
- Use indexes from `indexing-strategy.md` (never rely on “ORM magic”)
- Use projections for analytics
- Cache expensive queries in Redis (cache-aside) before hitting DB
- Connection pool sized for instance count × concurrency

# Security Rules

- Parameterized queries only (Drizzle default; no string concat SQL)
- Tenant isolation on every query
- Row ownership checks in repositories/use cases
- Audit logging for sensitive mutations
- Never log full row dumps of PII

# Related documents

- `docs/rules/drizzle-rules.md`
- `docs/architecture/database-architecture.md`
- `docs/architecture/indexing-strategy.md`
- `docs/architecture/query-strategy.md`
- `docs/architecture/data-modeling-guidelines.md`
- `docs/architecture/16-storage-architecture.md`
