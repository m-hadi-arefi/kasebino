# ARD-032 — Store Location & Maps

| Field | Value |
| --- | --- |
| ID | ARD-032 |
| Title | Store Location & Maps |
| Status | `todo` |
| Milestone | M1 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | store-first-evolution.md |

## Objective

Enforce mandatory store geo (address, latitude, longitude) and deliver map display + navigation affordances on storefront/customer surfaces.

## Business Value

Customers can find the store for pickup and foot traffic; trust signal for local retail.

## Requirements

- LOC-01, LOC-02
- SF-04

## Dependencies

- ARD-004 (fields)
- ARD-010 storefront info page
- ARD-034 pickup shows location

## Architecture

`store-location-architecture.md`. Validate WGS84; navigation via external maps URLs; map embed or static map provider (ADR for provider).

## Domain Model

GeoPoint VO on Store.

## API Contracts

Store payload includes `address`, `lat`, `lng`, `mapsDeepLink`.

## Events

- `StoreUpdated` when geo changes

## Persistence Strategy

### PostgreSQL + Drizzle

Columns on `stores`; optional PostGIS later (MVP plain numeric lat/lng + indexes not required for point lookup).

## Analytics / Audit / Tracking Requirements

- Analytics: NavigateClicked
- Audit: N/A
- Tracking: map interactions optional
- Metrics: navigation click-through

## UI Requirements

- **uiuxpromax REQUIRED** for map/location blocks

## Acceptance Criteria

- [ ] Cannot publish storefront without lat/lng/address
- [ ] Storefront shows map/pin
- [ ] Navigate opens external maps
- [ ] Pickup checkout shows pickup location

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

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + location architecture.

## Implementation Checklist

- [ ] Validation rules
- [ ] Storefront + pickup UI
- [ ] Provider ADR if needed
- [ ] Tests + STATUS

## Completion Protocol

Update STATUS + progress-log.
