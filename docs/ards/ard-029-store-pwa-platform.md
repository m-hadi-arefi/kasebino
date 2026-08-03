# ARD-029 — Store PWA Platform

| Field | Value |
| --- | --- |
| ID | ARD-029 |
| Title | Store PWA Platform |
| Status | `in_progress` (ADR-023 foundations: manifest + install UX; SW/analytics emit remain) |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | store-first-evolution.md |

## Objective

Deliver **per-store installable PWAs** with store branding, start_url to storefront, install prompts, and growth-loop instrumentation — distinct from merchant staff PWA (ARD-017).

## Business Value

Home-screen re-engagement drives membership and pickup reorders (see growth-loops-store-pwa.md).

## Requirements

- SF-13, SF-11
- NFR-06 (customer surface)
- PA tracking: StorePwaInstall*

## Dependencies

- ARD-010
- ARD-004 branding fields
- ARD-027/023 for install analytics
- Coordinate with ARD-017 (no manifest collision)

## Architecture

Dynamic/per-store web app manifest; shared SW with store-scoped caches; install UX on storefront; customer auth context (ARD-030).

See `docs/architecture/storefront-pwa-architecture.md`.

## Domain Model

Uses Store branding VOs; no new OLTP aggregates required beyond store fields.

## API Contracts

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/s/:slug/manifest.webmanifest` | per-store |
| GET | `/api/v1/stores/:id/pwa-meta` | icons/theme |

## Events

- `StorePwaInstallPromptShown`, `StorePwaInstalled`, `AppOpened` (source=store-pwa)

## Persistence Strategy

### PostgreSQL + Drizzle

Store branding/icon keys; no separate PWA tables required.

### MongoDB

Product analytics install events via ARD-021+.

## Analytics / Audit / Tracking Requirements

- Analytics: install funnel events
- Audit: N/A
- Tracking: install prompt / installed / launch
- Dashboard metrics: install rate per store (mgmt/product)

## UI Requirements

- **uiuxpromax REQUIRED** for install banners and store PWA shell

## Acceptance Criteria

- [x] Each active store has installable PWA with its name/icon/theme (dynamic manifest; default icon until branding upload)
- [x] start_url opens that store’s storefront
- [x] Distinct from staff POS PWA
- [ ] Install events attributable in analytics (names reserved; emit with analytics ADRs)

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

Global DoD + storefront-pwa-architecture + growth loop doc alignment.

## Implementation Checklist

- [x] Read storefront-pwa, membership, pickup architectures
- [x] Manifest strategy + SW scope (manifest path + online-first / catalog stretch; full SW later)
- [x] uiuxpromax install UX
- [x] Tests + STATUS (ADR-023 contract); ARD-029 full DoD remains open for SW/analytics emit

## Completion Protocol

Update STATUS + progress-log.
