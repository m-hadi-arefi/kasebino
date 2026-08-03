# 07 — Cache Architecture

Primary pattern: **cache-aside (cache-first reads)** with **event-driven invalidation**.

```
GET → Redis HIT → return
    → MISS → PostgreSQL → SET Redis (TTL) → return

MUTATION → DB commit → domain event → delete keys → next GET rebuilds
```

## Key principles

- Never treat Redis as source of truth
- Always include merchantId in keys
- Prefer explicit key delete over long stale TTLs for POS-critical data
- Analytics may tolerate short staleness (60s)

## Default TTLs

| Resource | TTL |
| --- | --- |
| Merchant, store, product, customer, settings | 300s |
| Analytics aggregations | 60s |
| Storefront catalog/pages | 600s |

## Write patterns

| Pattern | When |
| --- | --- |
| Cache-aside | Default reads |
| Read-through | Avoid for MVP (keep logic in app) |
| Write-through | Not default; optional for tiny settings docs |
| Write-around | Bulk imports (invalidate after) |

Detailed key naming & strategies: `cache-strategy.md`.
