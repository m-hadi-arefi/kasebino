# MongoDB Architecture

## Purpose

**MongoDB** is MerchantOS’s **analytical and telemetry data plane** — not the transactional system of record.

| Data plane | Technology | Owns |
| --- | --- | --- |
| OLTP (system of record) | PostgreSQL + **Drizzle ORM only** | Merchants, stores, products, inventory, sales, CRM, loyalty, orders, payments |
| Analytics / telemetry / audit warehouse | **MongoDB** | Event warehouse, audit log documents, clickstream, sessions, product analytics, security monitoring signals, management rollups that are write-heavy/append-only |

MongoDB **must never** become the source of truth for money movement, stock, or customer identity. Those remain PostgreSQL.

## Why MongoDB here

- High-volume append-only event ingest (clickstream, audit, warehouse)
- Flexible document shapes for evolving analytics properties
- Efficient time-series–style collections and TTL indexes for retention
- Horizontal scale for write-heavy telemetry without burdening POS OLTP

## Placement in system

```
App use cases / UI trackers
        │
        ├─► PostgreSQL (Drizzle)     // transactional commit
        ├─► Outbox → EMQX            // realtime
        └─► Analytics ingest port
                 │
                 ▼
         MongoDB clusters/collections
                 │
                 ▼
    Aggregation jobs / dashboards / admin monitors
```

Ingest is **async and failure-isolated**: MongoDB downtime must not block CompleteSale after PostgreSQL commit (buffer via outbox/queue if needed).

## Database / collection strategy

Logical databases (or prefixed collections) by concern:

| Area | Examples |
| --- | --- |
| `mos_events` | Domain event copies, warehouse envelopes |
| `mos_audit` | Security/compliance audit documents |
| `mos_product` | Product analytics facts, feature usage |
| `mos_behavior` | Clickstream, page views |
| `mos_sessions` | Session aggregates (start/heartbeat/end, duration, device class) — ADR-061 |
| `mos_security` | Auth anomalies, abuse signals |
| `mos_mgmt` | Pre-aggregated management dashboards — ADR-062 (`src/mgmt-dashboard-analytics`) |

Exact names are implementation choices; ARDs lock naming at implementation time.

## Document envelope (canonical)

All analytics/telemetry documents SHOULD carry:

```json
{
  "eventId": "uuid",
  "eventType": "string",
  "occurredAt": "ISO-8601",
  "ingestedAt": "ISO-8601",
  "merchantId": "uuid|null",
  "storeId": "uuid|null",
  "actorId": "uuid|null",
  "actorRole": "string|null",
  "sessionId": "string|null",
  "anonymousId": "string|null",
  "correlationId": "uuid",
  "causationId": "uuid|null",
  "source": "pos|storefront|admin|system|mobile-pwa",
  "schemaVersion": 1,
  "payload": {}
}
```

## Indexing principles (MongoDB)

- Always index `occurredAt` (and TTL where applicable)
- Tenant queries: compound `{ merchantId: 1, occurredAt: -1 }`
- Event type queries: `{ eventType: 1, occurredAt: -1 }`
- Session: `{ sessionId: 1, occurredAt: 1 }`
- Audit actor: `{ actorId: 1, occurredAt: -1 }`
- Unique `eventId` for idempotent ingest

## Multi-tenancy

- Merchant-scoped analytics documents include `merchantId`
- Platform/admin documents may omit merchant or use `merchantId: null` with stricter authZ
- Queries for merchant dashboards **must** filter `merchantId`
- Cross-tenant aggregation only for `platform_admin` with audited access

## Consistency model

| Concern | Model |
| --- | --- |
| OLTP truth | Strong (PostgreSQL TX) |
| Warehouse copy of domain events | At-least-once from outbox |
| Clickstream | Best-effort / at-least-once; client may batch |
| Dashboard aggregates | Eventual (seconds–minutes) |

## Drivers & boundaries

- Mongo access only through infrastructure adapters / repositories for analytics contexts
- Domain OLTP modules do not import Mongo drivers
- Application services publish to an **AnalyticsIngestPort** / **AuditPort** after successful business TX (or via outbox consumer)

## Docker / environments

Compose must include MongoDB for local parity (ARD-001 / ARD-019 impact). Separate URL env: `MONGODB_URL` (never commit secrets). Architecture drafts may mention `MONGODB_URI`; runtime and compose use `MONGODB_URL`.

## Related

- [analytics-architecture.md](./analytics-architecture.md)
- [event-warehouse-architecture.md](./event-warehouse-architecture.md)
- [audit-architecture.md](./audit-architecture.md)
- [docs/tech/mongodb.md](../tech/mongodb.md)
- [docs/rules/mongodb-rules.md](../rules/mongodb-rules.md)
