# -*- coding: utf-8 -*-
"""Enhance docs for Drizzle-first persistence + DB design in every ARD."""
from pathlib import Path

ROOT = Path(r"C:\Users\Hadi\Desktop\projects\kasbino")


def w(rel: str, content: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    print("wrote", rel)


def patch_file(rel: str, fn) -> None:
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    new = fn(text)
    if new != text:
        path.write_text(new.rstrip() + "\n", encoding="utf-8")
        print("patched", rel)
    else:
        print("unchanged", rel)


# Fix tech README duplicate/broken drizzle.md link
w(
    "docs/tech/README.md",
    """
# Tech Stack Knowledge Base

Implementation guides for MerchantOS. Each guide defines purpose, conventions, anti-patterns, and usage.

**Persistence stack (mandatory):** PostgreSQL + **Drizzle ORM** + Redis cache-aside + DDD repository pattern.

| Guide | File |
| --- | --- |
| Next.js | [nextjs.md](./nextjs.md) |
| React | [react.md](./react.md) |
| TypeScript | [typescript.md](./typescript.md) |
| TailwindCSS | [tailwindcss.md](./tailwindcss.md) |
| shadcn/ui | [shadcn-ui.md](./shadcn-ui.md) |
| PostgreSQL | [postgresql.md](./postgresql.md) |
| Drizzle ORM | [drizzle-orm.md](./drizzle-orm.md) |
| Redis | [redis.md](./redis.md) |
| EMQX | [emqx.md](./emqx.md) |
| MinIO | [minio.md](./minio.md) |
| Docker | [docker.md](./docker.md) |
| Docker Compose | [docker-compose.md](./docker-compose.md) |
| NextAuth | [nextauth.md](./nextauth.md) |
| TanStack Query | [tanstack-query.md](./tanstack-query.md) |
| Zustand | [zustand.md](./zustand.md) |
| PWA | [pwa.md](./pwa.md) |
| Zod | [zod.md](./zod.md) |
| React Hook Form | [react-hook-form.md](./react-hook-form.md) |
| OpenTelemetry | [opentelemetry.md](./opentelemetry.md) |
| JWT | [jwt.md](./jwt.md) |
""",
)

# Expand database-rules
w(
    "docs/rules/database-rules.md",
    """
# Database Rules

1. PostgreSQL is the system of record; **Drizzle ORM** is the only ORM.
2. UUID PKs; `created_at` / `updated_at` on every table; soft deletes where applicable.
3. Tenant columns (`merchant_id`) + composite/partial uniques per `data-modeling-guidelines.md`.
4. Migrations via **Drizzle Kit** only (forward-only in production).
5. Indexes designed query-first — see `indexing-strategy.md` (never “hope the ORM indexes”).
6. Transactions for multi-aggregate POS completion (UoW) via Drizzle `db.transaction`.
7. No unbounded table scans for dashboards — projections + Redis.
8. All access through repositories; domain/UI never import Drizzle.
9. Follow `docs/rules/drizzle-rules.md` completely.
10. No ARD Done without database design + migration review (quality gate).
""",
)

# rules README add drizzle-rules
rules_readme = (ROOT / "docs/rules/README.md").read_text(encoding="utf-8")
if "drizzle-rules.md" not in rules_readme:
    rules_readme = rules_readme.rstrip() + "\n- [drizzle-rules.md](./drizzle-rules.md)\n"
    (ROOT / "docs/rules/README.md").write_text(rules_readme, encoding="utf-8")
    print("patched rules README")

# Architecture README add DB docs
w(
    "docs/architecture/README.md",
    """
# Architecture Documentation

MerchantOS Phase 1: **modular monolith**, event-driven, DDD, extraction-ready.

**Persistence:** PostgreSQL + **Drizzle ORM** (only) + Redis cache-aside. Database design is Tier-0 — see database docs below before any schema work.

## Core documents

| # | Document | Purpose |
| --- | --- | --- |
| 01 | [01-system-overview.md](./01-system-overview.md) | End-to-end system view |
| 02 | [02-domain-map.md](./02-domain-map.md) | Domains & ownership |
| 03 | [03-bounded-contexts.md](./03-bounded-contexts.md) | Context boundaries |
| 04 | [04-event-driven-architecture.md](./04-event-driven-architecture.md) | Events & messaging |
| 05 | [05-multi-tenant-strategy.md](./05-multi-tenant-strategy.md) | Tenant isolation |
| 06 | [06-security-architecture.md](./06-security-architecture.md) | Security controls |
| 07 | [07-cache-architecture.md](./07-cache-architecture.md) | Redis caching |
| 08 | [08-real-time-architecture.md](./08-real-time-architecture.md) | EMQX realtime |
| 09 | [09-authentication-architecture.md](./09-authentication-architecture.md) | OTP + JWT |
| 10 | [10-observability-architecture.md](./10-observability-architecture.md) | Logs/metrics/traces |
| 11 | [11-deployment-architecture.md](./11-deployment-architecture.md) | Deploy topology |
| 12 | [12-infrastructure-architecture.md](./12-infrastructure-architecture.md) | Infra services |
| 13 | [13-pwa-architecture.md](./13-pwa-architecture.md) | PWA offline |
| 14 | [14-ddd-architecture.md](./14-ddd-architecture.md) | DDD layering |
| 15 | [15-api-architecture.md](./15-api-architecture.md) | HTTP/API design |
| 16 | [16-storage-architecture.md](./16-storage-architecture.md) | PostgreSQL + Drizzle + MinIO |
| 17 | [17-message-broker-architecture.md](./17-message-broker-architecture.md) | EMQX topics |
| 18 | [18-failure-recovery-architecture.md](./18-failure-recovery-architecture.md) | Resilience |
| 19 | [19-performance-architecture.md](./19-performance-architecture.md) | Perf budgets |
| 20 | [20-future-microservice-extraction.md](./20-future-microservice-extraction.md) | Extraction plan |

## Database architecture (Tier-0)

| Document | Purpose |
| --- | --- |
| [database-architecture.md](./database-architecture.md) | Capacity, tenancy, PG strategy |
| [indexing-strategy.md](./indexing-strategy.md) | Explicit indexes per table |
| [query-strategy.md](./query-strategy.md) | Query-first design |
| [data-modeling-guidelines.md](./data-modeling-guidelines.md) | Table/constraint standards |

## DDD & data plane

- [domain-model.md](./domain-model.md)
- [event-catalog.md](./event-catalog.md)
- [cache-strategy.md](./cache-strategy.md)

## Rules

Implementations MUST follow `docs/rules/architecture-rules.md`, `docs/rules/drizzle-rules.md`, `docs/rules/database-rules.md`.
""",
)

# Rewrite storage architecture
w(
    "docs/architecture/16-storage-architecture.md",
    """
# 16 — Storage Architecture

## Database layer

**PostgreSQL + Drizzle ORM** (mandatory, exclusive).

| Concern | Choice |
| --- | --- |
| RDBMS | PostgreSQL latest stable |
| Access | Drizzle ORM repositories only |
| Migrations | Drizzle Kit versioned SQL |
| Design authority | `database-architecture.md` + ARD Database Design |

## PostgreSQL (source of truth)

- UUID PKs
- `created_at`, `updated_at`, `deleted_at` (soft delete where applicable)
- `merchant_id` on tenant tables
- Audit log table for sensitive actions
- Explicit indexes per `indexing-strategy.md` (barcode, phone, sale time, order status, composites)
- Designed for 50k+ merchants / 5M+ customers / 50M+ transactions envelope

## Drizzle ORM (persistence)

- Schema modules per bounded context under `src/infrastructure/database/schema/`
- Migrations under `src/infrastructure/database/migrations/`
- Client factory under `src/infrastructure/database/drizzle/`
- Repository implementations in infrastructure; interfaces in domain/application
- Domain layer never imports Drizzle
- Parameterized queries only; no string-concat SQL
- Multi-aggregate writes use `db.transaction`

See `docs/tech/drizzle-orm.md` and `docs/rules/drizzle-rules.md`.

## Repository layer

```
Use case → repository interface (domain) → Drizzle repository (infrastructure) → PostgreSQL
```

## MinIO

Buckets (logical):

| Bucket | Content |
| --- | --- |
| receipts | Sale receipt PDFs/images |
| products | Product images |
| merchantdocs | Optional branding assets |

Use presigned upload/download URLs. Store object keys in DB, not binary.

## Redis

- Cache keys (in front of Drizzle reads)
- Rate limiting counters
- Optional ephemeral locks for sale idempotency

## Backup & retention

- DB backups env-specific
- Soft-deleted rows retained until policy purge job (future)
""",
)

print("core patches ok")
