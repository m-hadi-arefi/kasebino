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
- `src/infrastructure/redis/` — live `redis` client + adapters (ADR-108)
  - `client.ts` — REDIS_URL config + connect helpers
  - `redis-cache-aside-store.ts` — `CacheAsideStorePort`
  - `redis-rate-limit-store.ts` — `RateLimitRedisPort`
  - `create-redis-runtime.ts` — production composition factory
- `src/cache-aside/` — get-or-load helpers, CacheAsideStorePort, in-memory store (ADR-052)
- `src/cache-keys/` — key builders + TTL table (ADR-053)
- `src/cache-invalidation/` — event→key delete maps + `invalidateOnEvent` (ADR-054)
- `src/rate-limiting/` — rate-limit policies, Redis port, in-memory store (ADR-055)
- `module cache adapters` — domain call sites wire keys/TTL + outbox `cache_invalidation` handler

## Live vs mock paths (ADR-108)

| Mode | Env | Behavior |
| --- | --- | --- |
| **Live** | `REDIS_URL=redis://localhost:6379` (Compose host port) or `redis://redis:6379` (in-network) | `createAppContext` / `createProductionApiContext` → Redis cache + rate limiter |
| **Mock** | `MOS_REDIS_MODE=memory` (or `mock`), or missing `REDIS_URL` | In-memory stores for unit tests / offline CI |
| **Injected** | tests pass `rateLimiter` + `rateLimitMode: "injected"` | Handler isolation |

Start Redis: `docker compose up -d redis`

## Fail policies

- Cache-aside reads: **fail-open** → PostgreSQL loader
- OTP / auth rate limits: **fail-closed** → 429 Persian unavailable message
- default / admin / storefront rate limits: **fail-open**

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

Barcode and analytics caching paths; OTP `/api/v1/auth/otp/*` rate limits.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
