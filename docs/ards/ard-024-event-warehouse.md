# ARD-024 — Event Warehouse

| Field | Value |
| --- | --- |
| ID | ARD-024 |
| Title | Event Warehouse |
| Status | `todo` |
| Milestone | M3 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | analytics-requirements.md + event-catalog.md |

> **ADR-037 foundations (2026-08-03):** Catalog + payloadVersion governance in `src/event-naming`.
>
> **ADR-035 foundations (2026-08-03):** Outbox worker poll/dispatch in `src/outbox` with `mongodb_warehouse` consumer slot.
>
> **ADR-057 foundations (2026-08-03):** Append-only `mos_events` mirror + idempotent outbox consumer + lag metrics in `src/event-warehouse` (in-memory store).
>
> **ADR-064 foundations (2026-08-03):** Warehouse TTL 24m stance canonical in `src/data-retention`. This ARD remains `todo` until admin browse API/UI, live Mongo driver/TTL indexes, and full e2e catalog parity.

## Objective

Complete domain event warehousing: mirror the full MVP domain event catalog into MongoDB with payload versioning, outbox-driven delivery, lag metrics, and admin investigation queries.

## Business Value

Durable analytical history of business events without scanning OLTP or overloading EMQX consumers.

## Requirements

- PA-02, PA-09

## Dependencies

- ARD-021
- Transactional outbox from ARD-001+
- Full alignment with `event-catalog.md`

## Architecture

Warehouse consumer maps each `eventType` → Mongo collection/stream; DLQ for poison messages; metrics for lag. EMQX remains realtime fan-out only.

## Domain Model

Integration service only; no domain invariant changes.

## API Contracts

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/admin/warehouse/events` | admin search |

## Events

All MVP domain events from `docs/architecture/event-catalog.md` (mirrored).

## Persistence Strategy

### PostgreSQL + Drizzle

`outbox_events` remains SoT for publish reliability.

### MongoDB

`mos_events` (optionally stream-partitioned); indexes `eventType+occurredAt`, `merchantId+occurredAt`, unique `eventId`.

## Database Design

Envelope per mongodb-architecture; payload versions match catalog.

### Caching Plan

N/A for raw warehouse (query on demand).

## Security

Admin-only browse; mandatory merchant filters for tenant-scoped views.

## Analytics / Audit / Tracking Requirements

- **Analytics events:** mirrored domain set
- **Audit events:** optional dual-publish of audit stream (prefer ARD-022 collection)
- **Tracking events:** N/A
- **Dashboard metrics:** mirror lag, failure rate, throughput

## UI Requirements

- Admin query UI optional (may be API-only MVP); if UI → uiuxpromax

## Testing

Idempotency; lag metric; Mongo outage isolation from OLTP.

## Acceptance Criteria

- [x] All catalog domain events mirrored (mapping locked; runtime mirror via outbox handler)
- [x] Idempotent on `eventId`
- [x] Lag metrics exposed
- [x] Mongo outage does not block OLTP (outbox / ADR-065 isolation)
- [x] Mapping table documented
- [ ] Admin browse API/UI (reserved path; deferred)

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

Global DoD + warehouse architecture conformance.

## Implementation Checklist

- [x] Read warehouse/mongodb/analytics/audit/observability docs
- [x] eventType mapping table (`WAREHOUSE_EVENT_MAPPING` → mos_events / domain)
- [ ] Consumer hardening + DLQ (outbox retries + poison path remain ARD packaging)
- [x] Tests + STATUS (ADR-057 completed; this ARD remains todo for admin API/UI)

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] lint / typecheck / tests
- [ ] event-catalog parity review

## Completion Protocol

Update STATUS + progress-log.
