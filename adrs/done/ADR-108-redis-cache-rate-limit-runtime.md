# ADR-108 - Redis Cache-Aside and Rate-Limit Runtime

| Field | Value |
| --- | --- |
| ID | ADR-108 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Redis Cache-Aside and Rate-Limit Runtime

## Context

Cache-aside, key/TTL, invalidation, and rate-limit contracts exist with in-memory stores. Redis client is URL config only; no `redis`/`ioredis` driver; not wired to middleware/routes.

## Problem Statement

MVP cannot meet Redis-mandatory caching and rate limits (PRD §11.3–11.4); OTP/auth abuse unprotected at the edge.

## Goals

- Live Redis client for cache-aside reads and rate limiting.
- Invalidate keys on domain events (via outbox consumers).
- Enforce PRD limits: default 10 r/s; auth 5/min; OTP 3/min; admin 20 r/s.

## Non Goals

- Redis as session SoT (JWT remains stateless).
- Replacing OLTP with cache.

## Functional Requirements

- FR-1: Cache-aside for merchant/store/storefront/catalog/dashboard aggregations per TTL table.
- FR-2: Mutation/events delete relevant keys (ADR-054).
- FR-3: Rate limit middleware/helpers on routes especially auth/OTP.
- FR-4: Persian/standard error envelope when limited (`RATE_LIMITED`).

## Technical Design

1. Add Redis client dependency; implement `src/infrastructure/redis` connect.
2. Swap default stores in `cache-aside` and `rate-limiting` to Redis adapters.
3. Compose into ADR-094 route helpers and middleware.
4. Local Compose already provides Redis service.

## Database Changes

- None (Redis).

## Backend Changes

- Redis adapters; middleware wiring; invalidation consumers (worker or inline).

## Frontend Changes

- Surface rate-limit errors in Persian where applicable.

## Admin Changes

- Admin routes use higher limit class.

## API Changes

- Behavior only; status codes/envelopes for 429.

## Security Considerations

- OTP/auth limits mandatory before public launch.
- Key naming must include tenant partitions (ADR-053).

## Edge Cases

- Redis down: document fail-open vs fail-closed policy per path (OTP should fail-closed or degrade safely).
- Thundering herd after invalidation.

## Acceptance Criteria

- [ ] Cache hit path served from Redis in integration test.
- [ ] OTP endpoint returns rate-limit envelope after threshold.
- [ ] Product update invalidates storefront/product keys.
- [ ] Compose `REDIS_URL` used by app.

## Rollout Plan

Wire rate limits before exposing public OTP; cache warm storefront after catalog exists.

## Dependencies

- ADR-051–055, ADR-094, ADR-109 (invalidation events), ADR-112 (redis ready check)

## Risks

- Incorrect fail-open on auth routes.

## Related Documents

- `PRD.md` §11.3–11.4
- `docs/product/constraints.md`

## Iranian User Experience Requirements

- Persian rate-limit messages on OTP/login UI.

## Estimated Complexity

**L**
