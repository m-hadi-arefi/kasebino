# Redis

## Purpose

Cache-aside + rate limiting (+ idempotency helpers).

## Why chosen

Mandatory for NFR perf and auth abuse protection.

## Best practices

- Key naming from cache-strategy.md
- TTL always set
- Invalidate on events

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `src/redis-architecture/` — architecture contract (ADR-051)
- `src/infrastructure/redis/` — thin REDIS_URL client stub (ADR-051)
- `src/cache-aside/` — get-or-load helpers, CacheAsideStorePort, in-memory store (ADR-052)
- `src/cache-keys/` — key builders + TTL table (ADR-053)
- `src/cache-invalidation/` — event→key delete maps + `invalidateOnEvent` (ADR-054)
- `src/rate-limiting/` — rate-limit policies, Redis port, in-memory store (ADR-055)
- `src/shared/infrastructure/redis` — module-owned Redis protocol adapters (optional)
- `module cache adapters` — domain call sites wire keys/TTL + outbox `cache_invalidation` handler

## Anti-patterns

- Redis as source of truth
- FLUSHDB in app
- Keys without merchantId

## Performance recommendations

- Pipeline multi-get for dashboards
- Avoid giant values

## Security recommendations

- Auth rate limits fail closed if configured
- No PII in key names beyond phone hash if possible

## Example architecture usage

Barcode and analytics caching paths.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
