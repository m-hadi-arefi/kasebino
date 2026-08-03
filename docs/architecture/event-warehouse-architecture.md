# Event Warehouse Architecture

## Purpose

The **event warehouse** is an append-only MongoDB store of canonical domain and product events for analytics, investigation, and derived metrics — distinct from EMQX realtime fan-out and from PostgreSQL OLTP.

## Sources

1. **Transactional outbox bridge** — after domain events committed in PostgreSQL, a consumer writes warehouse documents (at-least-once).  
2. **Product analytics ingest API** — client/server track calls.  
3. **Audit publisher** — may dual-publish into warehouse + audit collection or audit-only.

## Why not query PostgreSQL for everything

- Protects POS latency from heavy analytical scans  
- Supports high-cardinality behavioral events not stored in OLTP  
- Enables long retention without bloating operational DB  

## Warehouse document

Use the canonical Mongo envelope (`mongodb-architecture.md`) with:

- `stream`: `domain` | `product` | `audit` | `security`  
- `payload`: event-specific body (aligned with `event-catalog.md` for domain)  

## Partitioning / collection sharding strategy

| Strategy | Guidance |
| --- | --- |
| Collection per stream | Simple ops for MVP |
| Time-series collections | Prefer for high-volume clickstream |
| Shard key (future) | `{ merchantId, occurredAt }` or hashed `merchantId` when scale requires |

## Processing

```
Outbox / Track API → Ingest adapter → Mongo insert (idempotent eventId)
                              ↓
                    Stream aggregators (optional)
                              ↓
              Materialized metric collections / mgmt dashboards
```

## Exactly-once illusion

Warehouse is at-least-once. Downstream aggregations must be idempotent on `eventId` or use deterministic upsert keys (`merchantId+day+metric`).

## Relationship to event-catalog.md

Domain warehouse payloads MUST match catalog `eventType` + `payloadVersion`. New domain events update catalog **and** warehouse mapping docs.

## Failure isolation

If Mongo unavailable: retry from outbox; never roll back completed sale. Track API may return 202 + buffer.

## Related ARDs

ARD-024 Event Warehouse, ARD-021 Analytics Platform foundation.
