# ADR-0007 — Drizzle ORM as Exclusive Persistence Layer

## Status

Accepted

## Context

MerchantOS needs a TypeScript-native, SQL-first data access layer that preserves DDD boundaries, supports explicit PostgreSQL indexing for POS hot paths, and scales toward 50k+ merchants without schema redesign. An earlier Prisma mention in discovery docs conflicted with the need for transparent SQL and migration control.

## Decision

**Drizzle ORM (latest stable) is the only approved ORM.**

Forbidden: Prisma, TypeORM, Sequelize, MikroORM, Objection, and any other ORM.

Stack: PostgreSQL + Drizzle Kit migrations + repository pattern + Redis cache-aside.

Database architecture is designed first; Drizzle schemas encode that architecture.

## Consequences

- All ARDs include Persistence Strategy + Database Design sections
- ard-to-code enforces a persistence gate before implementation
- Agents must read `drizzle-orm.md` and `drizzle-rules.md` before persistence work
- Existing docs/skills/rules updated to remove approved-use of alternative ORMs
