# ARD-033 — QR Acquisition System

| Field | Value |
| --- | --- |
| ID | ARD-033 |
| Title | QR Acquisition System |
| Status | `in_progress` |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | store-first-evolution.md |

## Objective

Generate printable store QR codes encoding storefront deep links (`src=qr`), merchant print UI, and acquisition analytics.

## Business Value

Converts physical visitors into digital members (growth-loops-qr.md).

## Requirements

- SF-12
- Attribution for membership joins

## Dependencies

- ARD-010
- ARD-004 slug/URL
- ARD-031 membership source=qr
- ARD-023/027 analytics

## Architecture

`qr-acquisition-architecture.md`. Stable URL; QR image assets in MinIO optional; regenerate branding without changing destination URL.

## Domain Model

StoreQrRef VO; event StoreQrGenerated.

## API Contracts

| Method | Path |
| --- | --- |
| GET | `/api/v1/stores/:id/qr` | PNG/SVG |
| POST | `/api/v1/stores/:id/qr/regenerate` | optional |

## Events

- `StoreQrGenerated`
- `StorefrontVisited` (source=qr)
- `MembershipCreated` (source=qr)

## Persistence Strategy

### PostgreSQL + Drizzle

Store slug/URL fields; optional qr_asset_key.

### MinIO

Optional stored QR PNG.

## Analytics / Audit / Tracking Requirements

- Analytics: QR land → join → first purchase funnel
- Audit: N/A
- Tracking: source=qr required
- Metrics: QR conversion rate

## UI Requirements

- **uiuxpromax REQUIRED** for merchant QR print page

## Acceptance Criteria

- [ ] Merchant can download/print store QR
- [ ] Scan opens correct storefront with attribution
- [ ] Join records source=qr
- [ ] Growth loop metrics available to analytics

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.
- Storefront SEO metadata Persian when applicable.

## RTL Requirements

- Implement RTL-first (`dir=rtl`, logical CSS).
- Mirror directional icons/navigation.
- No LTR-only layouts for in-scope screens.

## Persian UX Requirements

- Persian typography; strings must not clip or overflow.
- Plain-language errors for traditional merchants.
- Jalali dates + تومان formatting wherever shown.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.
- Customer journeys assume phone OTP + store visit.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + QR architecture + growth loop doc.

## Implementation Checklist

- [x] QR generation lib choice documented
- [ ] Merchant UI
- [x] Attribution contract (`source=qr` events reserved; warehouse emit remain)
- [x] Tests + STATUS (ADR-081 foundations)

## Completion Protocol

Update STATUS + progress-log.

### ADR-081 foundations (2026-08-03)

- Architecture contract in `src/qr-acquisition/` (stable URL `?src=qr`, MinIO `qr`, Persian sticker notes, attribution events).
- Merchant print UI, live PNG/SVG generation, and analytics emit remain for ARD-033 remainder.
