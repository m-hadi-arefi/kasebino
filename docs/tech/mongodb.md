# MongoDB

## Purpose

Analytical/telemetry document store for MerchantOS: event warehouse, audit, clickstream, sessions, product analytics, security monitoring, management rollups.

## Why chosen

- Append-heavy analytics without stressing PostgreSQL OLTP  
- Flexible documents for evolving event properties  
- TTL indexes and horizontal scale for telemetry  

## Relationship to Drizzle / PostgreSQL

- **PostgreSQL + Drizzle** remain the only OLTP stack and monetary/inventory source of truth  
- MongoDB is **not** an OLTP ORM replacement and **must not** store authoritative stock/sale ledgers  
- No Prisma/TypeORM/etc. — and Drizzle is not used for MongoDB  

## Best practices

- Idempotent inserts on `eventId`  
- Compound indexes including `merchantId` + time  
- Async ingest; isolate failures from checkout  
- Schema versioning on envelopes  
- PII minimization  

## Project conventions

- Access via analytics/audit infrastructure adapters only  
- Config: `MONGODB_URL` (compose / `.env.example`; do not use a divergent alias in app code)  
- Local: Docker Compose `mongo` service  

## Folder conventions

```
src/mongodb-analytics/          # plane contract (ADR-056)
src/infrastructure/mongodb/   # client stub / future adapters — not domain
src/modules/analytics/          # later ARDs
src/modules/audit/              # later ARDs
```

## Anti-patterns

- Writing sale totals only to Mongo  
- Cross-tenant analytics queries without admin gate  
- Blocking HTTP requests on Mongo write in POS complete path  
- Dual SoT without clear reconciliation rules  

## Performance recommendations

- Batch clickstream  
- Time-series collections for behavior  
- Pre-aggregate management dashboards  

## Security recommendations

- AuthZ on all query APIs  
- Encrypt in transit  
- Restrict credentials; separate read vs write users if possible  

## Example architecture usage

Outbox consumer persists `SaleCompleted` into warehouse; product tracker sends `FeatureUsed`; admin dashboard reads rollups from `mos_mgmt`.

## Related

`docs/architecture/mongodb-architecture.md`, `docs/rules/mongodb-rules.md`
