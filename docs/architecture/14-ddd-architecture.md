# 14 — DDD Architecture

## Layering (mandatory)

```
src/modules/<context>/
  domain/
    aggregates/
    entities/
    value-objects/
    events/
    services/
    repositories/   # interfaces only
  application/
    use-cases/
    dto/
    ports/
  infrastructure/
    persistence/    # Drizzle repository impl
    messaging/
    cache/
  api/
  ui/
```

## Tactical patterns

| Pattern | Rule |
| --- | --- |
| Aggregate | Consistency boundary; external refs by ID |
| Entity | Identity equality |
| Value Object | Immutable; structural equality |
| Domain Service | Logic that doesn't fit one aggregate |
| Application Service | Transaction orchestration; no business invariants leakage to UI |
| Repository | Aggregate persistence only |
| Domain Event | Past tense; emitted after successful mutation |
| Anti-Corruption Layer | For storefront/admin/external PSP |

## Ubiquitous language

Use PRD terms: Merchant, Store, Product, Sale, Customer, Points, Wallet, Order — not vague "Item/User" for customers.

## Persistence mapping

| Layer | Responsibility |
| --- | --- |
| Domain | Pure DDD; repository **interfaces** only |
| Application | Use cases; declare transaction boundaries |
| Infrastructure | Drizzle schemas, migrations, repository **implementations** |

Centralized Drizzle schema/migrations live under `src/infrastructure/database/`. Module persistence adapters may wrap those tables.

## Forbidden

- Drizzle schemas / `drizzle-orm` imported into domain or UI layers
- Any ORM other than Drizzle
- Business rules only in React components
- Cross-module aggregate mutation without use case/event
- Designing tables around ORM convenience instead of query-first DB design

Full model: `domain-model.md`. Rules: `docs/rules/ddd-rules.md`, `docs/rules/drizzle-rules.md`.
