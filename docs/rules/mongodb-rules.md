# MongoDB Rules

1. MongoDB is for analytics, warehouse, audit, behavior, security signals, and management rollups — **not** OLTP source of truth.
2. PostgreSQL + Drizzle remain mandatory for transactional aggregates.
3. Mongo access only through infrastructure adapters in analytics/audit modules — never from React UI directly to DB credentials.
4. All merchant-scoped documents include `merchantId`; queries must filter it.
5. Ingest must be idempotent on `eventId`.
6. POS/checkout must not fail if Mongo is down (buffer/retry).
7. Follow retention TTLs in `data-retention-architecture.md`.
8. No alternative analytics DB without ADR (e.g. clicking in ClickHouse later requires ADR).
9. Update warehouse mappings when `event-catalog.md` changes.
10. Platform-only collections require `platform_admin` authZ + access audit.
