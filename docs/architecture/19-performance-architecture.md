# 19 — Performance Architecture

## Budgets (binding)

| Path | Budget |
| --- | --- |
| Barcode resolve | ≤ 1s |
| Product search p95 | ≤ 100ms (cached/local) |
| Full POS checkout | < 5s |
| Storefront LCP | Meet Lighthouse targets |
| Landing | Lighthouse ≥ 95 |
| Primary merchant screens | Lighthouse > 90 |

## Strategies

1. Cache-aside for products/categories by barcode & search tokens
2. Debounced search; local fuse/fuzzy index optional in POS client
3. Avoid over-fetching RSC payloads on POS
4. DB indexes for hot lookups
5. Analytics pre-aggregation tables updated async from events
6. Image optimization via Next.js + MinIO CDN-like caching headers
7. Horizontal scale; no sticky sessions required

## Measurement

- Server timings header / OTel spans for barcode & checkout
- Synthetic check for barcode path in staging

## Database performance

- Query-first indexes (`indexing-strategy.md`)
- Drizzle projections — select only needed columns
- CompleteSale as one transaction; avoid N+1 with joins/`inArray`
- Redis before PostgreSQL for hot entity reads
- Analytics from projection tables, not full sales scans
- Design envelope: 50k merchants / 5M customers / 50M transactions

## Anti-patterns

- N+1 SQL/Drizzle queries on checkout
- Recomputing analytics on every dashboard open without cache
- Blocking HTTP on MQTT publish
- Missing composite `(merchant_id, …)` indexes on hot paths
- Alternative ORMs or raw string-concat SQL
