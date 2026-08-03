# Drizzle Rules (Mandatory)

Drizzle ORM is the **only** approved persistence ORM. Violations fail architecture validation and block ARD completion.

## Mandatory Rules

1. **All database access goes through repositories.**
2. **No direct ORM usage in UI** (React components, pages, hooks).
3. **No direct ORM usage in domain layer.**
4. **Use transactions for multi-aggregate updates** (e.g. CompleteSale).
5. **Every table must have indexes** appropriate to its query paths (PK alone is insufficient for tenant tables).
6. **Every table must have `createdAt`.**
7. **Every table must have `updatedAt`.**
8. **Every table must support auditability** (fields and/or `audit_logs` for sensitive mutations).
9. **Soft delete where applicable** (`deletedAt`); default reads exclude soft-deleted rows.
10. **Repository interfaces belong to domain/application layers**; Drizzle implementations belong to infrastructure.

## Forbidden

- Prisma, TypeORM, Sequelize, MikroORM, Objection, or any other ORM
- Importing `drizzle-orm` / schema tables into `domain/` or UI
- Ad-hoc `db.select` in route handlers — call a use case → repository
- Designing tables “around” Drizzle convenience instead of query-first DB design
- Shipping schema changes without Drizzle Kit migration review
- Missing `merchantId` filters on tenant data

## Required practices

- Read `docs/tech/drizzle-orm.md` before any persistence work
- Update ARD Database Design before schema edit
- Define indexes explicitly in schema/migrations
- Prefer keyset pagination on hot paths
- Map domain aggregates ↔ persistence models in infrastructure (anti-corruption)

## Quality gate (persistence)

Before ARD Done:

- [ ] Table design reviewed
- [ ] Query patterns reviewed
- [ ] Indexes + composites reviewed
- [ ] Multi-tenancy reviewed
- [ ] PostgreSQL performance reviewed
- [ ] Drizzle schema reviewed
- [ ] Cache strategy reviewed
- [ ] Migration strategy reviewed
- [ ] Drizzle migrations generated and reviewed
