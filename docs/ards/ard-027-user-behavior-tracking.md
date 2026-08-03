# ARD-027 — User Behavior Tracking

| Field | Value |
| --- | --- |
| ID | ARD-027 |
| Title | User Behavior Tracking |
| Status | `todo` |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | analytics-requirements.md |

> **ADR-064 foundations (2026-08-03):** Clickstream/session TTL 90–180d canonical in `src/data-retention` (legal hold overrides). Live TTL indexes remain with HTTP beacon/session.

## Objective

Deliver clickstream and session analytics across merchant app and storefront, including batch beacon ingest and session heartbeats.

## Business Value

Reveal UX friction and storefront conversion drop-offs.

## Requirements

- PA-04, PA-06

## Dependencies

- ARD-021
- ARD-010 Storefront
- ARD-013 Dashboard shell (merchant app routes)

## Architecture

Lightweight client tracker + beacon API; 30-minute session timeout; 100% sampling for funnel events; optional sampling for noisy events.

## Domain Model

Telemetry only.

## API Contracts

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/analytics/beacon` | batch |
| POST | `/api/v1/analytics/session` | start/heartbeat/end |

## Events

- `PageViewed`, `ElementClicked`
- `SessionStarted`, `SessionHeartbeat`, `SessionEnded`
- `StorefrontViewed`, `ProductDetailViewed`
- Storefront funnel companions from product analytics as applicable

## Persistence Strategy

### PostgreSQL + Drizzle

None required.

### MongoDB

`mos_behavior` time-series; TTL 90–180 days.

## Database Design

Indexes: `sessionId+occurredAt`, `merchantId+occurredAt`, `eventType+occurredAt`, unique `eventId`.

### Caching Plan

Client may queue offline (PWA) then beacon — server cache N/A.

## Security

Rate-limit beacons; strip PII; CORS locked to app origins.

## Analytics / Audit / Tracking Requirements

- Analytics: session KPIs, path stats
- Audit: N/A
- **Tracking events:** full clickstream/session catalog above
- Dashboard metrics: sessions/day, avg duration, funnel step counts

## UI Requirements

- No dedicated merchant UI required (admin exploration optional under 025)

## Testing

Session heartbeat; batch ingest; tenant scoping for storefront.

## Acceptance Criteria

- [ ] Sessions created and heartbeated
- [ ] Page views stored with merchant scoping
- [ ] Storefront funnel events 100% sampled
- [x] Retention TTL configured (ADR-064 `src/data-retention`; live createIndexes remain)

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

Global DoD + user-behavior-tracking-architecture.

## Implementation Checklist

- [x] Read behavior/analytics/mongodb architectures
- [x] Clickstream track helpers + sampling + PII scrub (`src/clickstream`, ADR-060)
- [x] Session start/heartbeat/end helpers + idle timeout (`src/session-analytics`, ADR-061)
- [ ] Beacon + session HTTP Route Handlers
- [ ] Client integration guidelines doc (documentation)
- [x] Tests + STATUS (ADR-060/061 contracts); ARD-027 full DoD remains open for HTTP/SDK/driver

## Validation Checklist

- [x] iranian-first-development.md conformance
- [x] iranian-feature-checklist.md passed (or N/A with reason)
- [x] RTL + Persian copy reviewed for in-scope screens
- [x] lint / typecheck / tests
- [x] privacy scrubbing review

## Completion Protocol

Update STATUS + progress-log.

### ADR-060 foundation (2026-08-03)

- Encoded in `src/clickstream/`: PageViewed / ElementClicked / ScrollDepth (sampled) + POS/storefront companions, `trackClickstream` + `ingestBeaconBatch` via ADR-065 `best_effort_track`, `mos_behavior` (ADR-056; colloquial `mos_clickstream`), POS critical + funnel companions 100%, noisy sample rate, phone hash/secret scrub, Persian metric labels, CORS/API reserve, TTL 90–180d stance.

### ADR-061 foundation (2026-08-03)

- Encoded in `src/session-analytics/`: client UUID `sessionId`, `SessionStarted` / `SessionHeartbeat` / `SessionEnded`, 30-minute idle timeout, duration + device class aggregates → `mos_sessions`, Iran timezone notes (UTC store / Jalali `Asia/Tehran` presentation), Persian metric labels, `trackSession` via ADR-065 `best_effort_track` (in-memory).
- Remaining for ARD-027 packaging: `POST /api/v1/analytics/beacon`, `POST /api/v1/analytics/session` HTTP handlers, client SDK wiring, live Mongo driver/TTL indexes, optional admin path exploration under ARD-025.
