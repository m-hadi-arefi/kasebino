# ADR-0008 — MongoDB Analytics & Telemetry Plane

## Status

Accepted

## Context

MerchantOS needs full product analytics, clickstream, session analytics, audit scale, event warehousing, management reporting, and security monitoring. Putting these write-heavy, evolving schemas into PostgreSQL OLTP would endanger POS latency and complicate retention.

## Decision

Introduce **MongoDB** as the dedicated analytics/telemetry/audit warehouse plane.

- PostgreSQL + Drizzle remain the only OLTP system of record.  
- MongoDB must not store authoritative monetary or inventory ledgers.  
- Ingest is async and failure-isolated from checkout.  

Delivered via ARD-021–028.

## Consequences

- Compose/prod topologies include MongoDB  
- ard-to-code requires analytics/audit/warehouse/observability reading + telemetry gate  
- New rules: mongodb-rules, analytics-rules, audit-rules  
- Dual-read discipline for dashboards (money from PG, engagement from Mongo)  
