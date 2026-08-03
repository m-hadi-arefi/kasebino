# Data Retention Architecture

## Purpose

Define how long OLTP, analytics, audit, and telemetry data live — balancing product value, cost, and compliance (open legal Q on phone storage).

## Implementation

Canonical contract: **`src/data-retention/`** (ADR-064). Live Mongo `createIndexes` TTL jobs and ops legal-hold CRUD remain ARD-019 / ARD-021 packaging.

## Principles

1. OLTP soft-delete ≠ analytics delete (may retain hashed aggregates).
2. TTLs in MongoDB for high-volume streams.
3. Legal hold capability pauses purge.
4. Retention configs are environment-overridable documented defaults.
5. Soft-deleted `store_memberships` outlive analytics streams (≥36 months grace; hard purge Phase 2).

## Default retention matrix

| Data class | Store | Default retention |
| --- | --- | --- |
| Sales / orders / ledger | PostgreSQL | Indefinite (business records); archive strategy Phase 2 |
| Customers | PostgreSQL | Until soft-delete + purge policy (≥36m grace) |
| Soft-deleted memberships | PostgreSQL | ≥36 months grace; Phase-2 hard purge; legal hold blocks |
| Domain event warehouse | MongoDB | 24 months hot (`mos_events.ingestedAt`) |
| Clickstream / sessions | MongoDB | 90–180 days (`mos_behavior` / `mos_sessions`) |
| Product analytics events | MongoDB | 12–24 months |
| Feature usage rollups | MongoDB | 24 months |
| Audit (security/admin) | MongoDB | 24–36 months (`mos_audit`) |
| Security signals | MongoDB | 12–24 months |
| Management daily rollups | MongoDB | 36 months |
| Application logs | Log backend | 14–30 days |
| OTel traces | Trace backend | 7–14 days |

## Purge mechanics

- MongoDB TTL indexes on `occurredAt` / `ingestedAt` / `startedAt` where applicable
- Batch jobs for complex deletes
- Never TTL the PostgreSQL sales table via analytics policies
- Legal hold overrides TTL and batch purge

## Iranian operator messaging

Persian privacy copy keys live in `RETENTION_PRIVACY_COPY_FA` (`src/data-retention`). Ops UI (RTL / Jalali) deferred.

## Related

Audit, MongoDB, Analytics architectures; AGENT.md retention section; ADR-064.
