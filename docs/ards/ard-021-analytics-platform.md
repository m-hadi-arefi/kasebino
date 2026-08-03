# ARD-021 — Analytics Platform

| Field | Value |
| --- | --- |
| ID | ARD-021 |
| Title | Analytics Platform |
| Status | `todo` |
| Milestone | M3 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md + docs/product/analytics-requirements.md |

> **ADR-036 foundations (2026-08-03):** Shared event envelope + `mongodb_warehouse` consumer explicitly off checkout critical path in `src/event-driven`. This ARD remains `todo` until live Mongo driver/indexes and module scaffolding for ARD-022–028.

> **ADR-014 foundations (2026-08-03):** Plane split encoded in `src/analytics-boundaries` (Mongo never OLTP SoT; platform analytics admin-only; money truth PG).

> **ADR-056 foundations (2026-08-03):** Mongo analytics plane contract in `src/mongodb-analytics` (`mos_*` collections, envelope, `MONGODB_URL`) + thin `src/infrastructure/mongodb` stub; Compose `mongo` verified.

> **ADR-065 foundations (2026-08-03):** Failure isolation in `src/analytics-ingest-isolation` — fire-and-forget buffer/queue, retry→drop/DLQ, ingest metrics; CompleteSale / SaleCompleted succeed when Mongo is down.

> **ADR-057 foundations (2026-08-03):** Event warehouse in `src/event-warehouse` — append-only `mos_events` mirror, idempotent outbox `mongodb_warehouse` consumer, lag metrics, tenant fields, Persian UTF-8 payloads (in-memory store). Live Mongo driver / TTL indexes / admin browse remain.

> **ADR-058 foundations (2026-08-03):** Audit logging in `src/audit-logging` — insert-only `mos_audit` via AuditPort, phone PII scrub, Persian action labels, fail-open for OLTP (in-memory store). Admin browse API/UI + live driver remain ARD-022.

> **ADR-059 foundations (2026-08-03):** Product analytics in `src/product-analytics` — FeatureUsed + funnels → `mos_product` via `trackEvent` (ADR-065), Persian metric labels, phone scrub (in-memory). HTTP track + admin UI remain ARD-023.

> **ADR-060 foundations (2026-08-03):** Clickstream in `src/clickstream` — PageViewed/ElementClicked beacons → `mos_behavior` (colloquial mos_clickstream) via ADR-065, POS/funnel 100% sample, noisy sampling, PII scrub (in-memory). HTTP beacon remains ARD-027.

> **ADR-061 foundations (2026-08-03):** Session analytics in `src/session-analytics` — client UUID sessionId, heartbeat + 30m idle timeout, Session* events → `mos_sessions` (duration, device class), Iran TZ notes, via ADR-065 (in-memory). HTTP session API + client SDK remain ARD-027.

> **ADR-062 foundations (2026-08-03):** Management dashboard analytics in `src/mgmt-dashboard-analytics` — `mos_mgmt` portfolio rollups, platform_admin + audited access, DAM/MAM/GMV instrument notes (GMV proxy reconciles to PG), Persian titles, freshness SLAs (in-memory). HTTP APIs / uiuxpromax remain ARD-025 / ADR-089.

> **ADR-064 foundations (2026-08-03):** Data retention in `src/data-retention` — TTL matrix (clickstream/sessions/audit/warehouse), legal hold, membership soft-delete grace, Persian privacy copy keys. Live Mongo createIndexes / purge workers remain.

## Objective

Establish the MongoDB-backed analytics platform foundation: ingest ports, shared event envelope, idempotent writers, outbox→warehouse bridge skeleton, Mongo in Compose, and module scaffolding for ARD-022–028.

## Business Value

Unblocks product analytics, audit scale, clickstream, and management reporting without endangering POS OLTP performance or correctness.

## Requirements

- PA-01, PA-02, PA-09, PA-11, PA-12
- NFR-05 (correlation with observability)

## Dependencies

- ARD-001
- ARD-015 recommended for realtime hooks
- ARD-019 for production topology

## Architecture

Modules: `analytics` + `src/infrastructure/mongodb`. Ports: `AnalyticsIngestPort`, `OutboxWarehouseConsumer`. **Does not replace** ARD-016 PostgreSQL merchant dashboards.

Data planes:

- OLTP: PostgreSQL + Drizzle
- Analytics: MongoDB

## Domain Model

No OLTP aggregates. Application services: `IngestEvent`, `MirrorDomainEvent`.

## API Contracts

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/analytics/ingest` | auth’d / batched track |
| GET | `/api/v1/analytics/health/mongo` | optional readiness dependency |

## Events

- `AnalyticsIngestAccepted` (optional)
- `WarehouseMirrorFailed` (ops)

## Persistence Strategy

### PostgreSQL + Drizzle (OLTP)

Existing `outbox_events` / `processed_events` only. Ready probe may soft-depend on Mongo.

### MongoDB

Bootstrap logical DBs/collections `mos_events`, `mos_product` stubs; unique `eventId`; indexes `{merchantId, occurredAt}` .

Drizzle remains the only SQL ORM. Mongo uses official driver adapters — not an alternate SQL ORM.

## Database Design

See Objective Mongo collections above. Design for high-volume append at 50k-merchant envelope without impacting POS.

### Caching Plan

Optional Redis debounce for client batch tokens — not primary store.

### Migration Plan

Add Mongo service to Compose/env (`MONGODB_URL`); collection naming locked in ADR-056 (`mos_*`); index bootstrap with ingest (ADR-057).

## Security

Ingest authZ; rate-limit track endpoints; forbid secrets (OTP/JWT/payment raw) in payloads.

## Analytics / Audit / Tracking Requirements

Must define before implementation:

- Required analytics events (platform bootstrap + mirror list)
- Required audit events (none yet — port only)
- Required tracking events (ingest contract)
- Required dashboard metrics (health: ingest rate, mirror lag)

## UI Requirements

- No end-user UI in this ARD

## Testing

- Idempotent ingest
- Tenant isolation on read APIs if any
- [x] OLTP success when Mongo down (buffer/retry) — ADR-065 `src/analytics-ingest-isolation`

## Acceptance Criteria

- [x] Mongo available in Compose
- [ ] Idempotent ingest by `eventId`
- [x] Domain outbox mirrors at least one event type end-to-end — ADR-057 `src/event-warehouse` outbox handler + in-memory store
- [x] POS complete unaffected when Mongo stopped — ADR-065 isolation package + CompleteSale fail-open port
- [ ] Analytics/audit/tracking lists documented in progress-log
- [ ] MongoDB indexes reviewed
- [x] PostgreSQL/Drizzle SoT boundaries respected

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.

## RTL Requirements

- Implement RTL-first (`dir=rtl`, logical CSS).
- Mirror directional icons/navigation.
- No LTR-only layouts for in-scope screens.

## Persian UX Requirements

- Persian typography; strings must not clip or overflow.
- Plain-language errors for traditional merchants.
- Jalali dates + تومان formatting wherever shown.
- Reports: Persian labels + Jalali/`Asia/Tehran` buckets for humans.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + `mongodb-rules.md` + `analytics-rules.md`.

## Implementation Checklist

- [x] Read analytics, audit, mongodb, event-warehouse, observability architectures
- [x] Mongo plane contract + thin client stub (`src/mongodb-analytics`, `src/infrastructure/mongodb`) — ADR-056
- [ ] Mongo client adapter + envelope Zod (protocol driver)
- [ ] Outbox bridge worker skeleton
- [ ] Module folders + docs
- [ ] Tests + STATUS update

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] lint / typecheck / tests (when code phase runs)
- [ ] mongodb-rules + analytics-rules conformance
- [ ] architecture validation

## Completion Protocol

Update STATUS + progress-log; only complete after validation.
