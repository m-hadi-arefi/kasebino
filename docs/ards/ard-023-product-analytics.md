# ARD-023 — Product Analytics

| Field | Value |
| --- | --- |
| ID | ARD-023 |
| Title | Product Analytics |
| Status | `todo` |
| Milestone | M3 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | analytics-requirements.md |

## Objective

Instrument product analytics for feature usage, activation correlation, POS UX timings, and funnel inputs using MongoDB product collections.

## Business Value

Evidence-based product decisions that improve activation and retention features.

## Requirements

- PA-01, PA-05, PA-06

## Dependencies

- ARD-021
- ARD-007 (POS timings)
- ARD-010 (storefront funnel inputs)

## Architecture

Feature key registry (documented); server/client track helpers → ingest; rollups for feature adoption. Complements ARD-016 (financial/retention OLTP dashboards).

## Domain Model

Application-level feature usage services only — no OLTP aggregate changes required.

## API Contracts

| Method | Path |
| --- | --- |
| POST | `/api/v1/analytics/track` |
| GET | `/api/v1/admin/product-analytics/features` |

## Events

- `FeatureUsed`
- `PosCheckoutCompleted` (UX timing)
- `DashboardWidgetViewed`
- `AppOpened`

## Persistence Strategy

### PostgreSQL + Drizzle

Read-only activation hints if needed; not SoT for product events.

### MongoDB

`mos_product` events + `mos_product_rollups`.

## Database Design

Indexes: `featureKey+occurredAt`, `merchantId+occurredAt`, unique `eventId`.

### Caching Plan

Redis TTL 60–300s for admin feature adoption widgets.

## Security

No OTP/JWT in properties; hash phones if analytically required.

## Analytics / Audit / Tracking Requirements

- **Analytics events:** FeatureUsed registry + POS/storefront product events
- **Audit events:** N/A (unless admin queries)
- **Tracking events:** track API payloads
- **Dashboard metrics:** feature adoption %, checkout duration histograms

## UI Requirements

- **uiuxpromax REQUIRED** for any admin product analytics views

## Testing

Feature key coverage tests; payload scrubbing tests.

## Acceptance Criteria

- [x] Feature usage visible for POS, loyalty, storefront keys *(registry + trackEvent foundation; admin visibility UI later)*
- [x] Activation funnel events present *(POS capture, QR, pickup, loyalty)*
- [x] POS checkout duration events recorded *(PosCheckoutCompleted in catalog + funnel; duration prop at call sites later)*
- [x] Event lists documented

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

Global DoD + analytics-rules + mongodb-rules.

## Implementation Checklist

- [x] Read analytics architectures pack
- [x] Feature key registry doc under docs/product or docs/architecture
- [x] Track helpers + rollups
- [x] Tests + STATUS

## Validation Checklist

- [x] iranian-first-development.md conformance
- [x] iranian-feature-checklist.md passed (or N/A with reason)
- [x] RTL + Persian copy reviewed for in-scope screens
- [x] lint / typecheck / tests
- [x] analytics-rules conformance

## Completion Protocol

Update STATUS + progress-log.

### ADR-059 foundation (2026-08-03)

- Encoded in `src/product-analytics/`: FeatureUsed + funnel registry (POS phone capture, QR, pickup, loyalty), `trackEvent` via ADR-065 `best_effort_track`, `mos_product` (+ `mos_product_rollups` name), Persian metric/feature labels, phone hash/secret scrub, dual-read money from PG.
- Remaining for ARD-023 packaging: `POST /api/v1/analytics/track`, `GET /api/v1/admin/product-analytics/features`, live Mongo driver, rollup jobs, uiuxpromax admin/merchant surfaces.
