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

Buckets (MVP — ADR-040 `src/minio-storage/`):

| Bucket | Content |
| --- | --- |
| receipts | Sale receipt PDFs/images |
| media | Product / catalog images (ADR prose “products”) |
| qr | Store QR PNG assets (ARD-033; branding docs subset) |

Use presigned upload/download URLs. Store object keys in DB, not binary.
Private buckets by default; type/size limits enforced at the storage port.
Persian (fa) original filenames: UTF-8 metadata encoding (not ASCII-scrubbed).

## Redis

- Cache keys (in front of Drizzle reads)
- Rate limiting counters
- Optional ephemeral locks for sale idempotency

## Backup & retention

- DB backups env-specific
- Soft-deleted rows retained until policy purge job (future)
