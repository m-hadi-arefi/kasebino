# 04 — Event-Driven Architecture

## Goals

- Decouple side effects (cache, realtime, analytics, notifications)
- Enable future microservice extraction
- Keep write path explicit and auditable

## Patterns

| Pattern | Usage |
| --- | --- |
| Domain events | Raised by aggregates after successful invariants |
| Transactional outbox | Persist events in same DB TX as aggregate |
| Publisher | Outbox processor → EMQX + in-process handlers |
| Idempotent consumers | Consumer key = eventId |
| Cache invalidation subscribers | Delete Redis keys by pattern/map |
| Realtime fan-out | EMQX topics per merchant |

## Event envelope (canonical)

```json
{
  "eventId": "uuid",
  "eventType": "SaleCompleted",
  "occurredAt": "ISO-8601",
  "merchantId": "uuid",
  "storeId": "uuid|null",
  "actorId": "uuid|null",
  "correlationId": "uuid",
  "causationId": "uuid|null",
  "payloadVersion": 1,
  "payload": {}
}
```

## Delivery guarantees

- At-least-once to EMQX and in-process bus
- Consumers must be idempotent
- Retries: exponential backoff 1s, 5s, 30s, 2m, 10m; then dead-letter table

## In-process vs broker

| Concern | Channel |
| --- | --- |
| Cache invalidation (same app) | In-process after commit OR Redis pub as backup |
| UI realtime | EMQX MQTT |
| Cross-instance fan-out | EMQX |
| Future services | EMQX + outbox |

## CQRS readiness

- Commands mutate aggregates and emit events
- Queries read from tables + Redis; optional materialized views later
- Full event sourcing NOT required for MVP

See `event-catalog.md` for every event definition.
