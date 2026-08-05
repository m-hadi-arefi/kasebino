# ADR-104 - Store Location, Static Maps, Navigation, and QR Print

| Field | Value |
| --- | --- |
| ID | ADR-104 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Store Location, Static Maps, Navigation, and QR Print

## Context

LOC-01/02 and SF-12 are P0. Store domain requires address + lat/lng; storefront about page defers map; QR acquisition architecture exists without printable runtime UI.

## Problem Statement

Stores cannot fulfill mandatory geo, storefront map/nav, or printable QR acquisition loop.

## Goals

- Enforce structured address + lat/lng on store create/update.
- Storefront shows static map image + external Navigate deep links (ADR-091).
- Generate printable store QR encoding `/s/{storeSlug}?src=qr`.

## Non Goals

- Interactive map SDK embed requirement.
- Subdomain QR targets.

## Functional Requirements

- FR-1: LOC-01 mandatory geo fields on store.
- FR-2: LOC-02 static map + Navigate affordance on storefront about.
- FR-3: SF-12 QR generate + print-friendly merchant page.
- FR-4: Analytics attribution `source=qr` on land (coordinate ADR-110 beacons).

## Technical Design

1. Validate lat/lng ranges on store commands (ADR-121 onboarding uses same rules).
2. Static map image via provider adapter port (swapable); fallback to address text if provider missing in local.
3. Navigate links: Neshan / Google / Apple / `geo:` as available.
4. QR PNG (server or client library) for merchant print view; MinIO optional store via ADR-111.

## Database Changes

- Store address/geo columns already modeled - enforce NOT NULL at app layer if migration already nullable for bootstrap.

## Backend Changes

- Store validation; map URL builder port; QR image endpoint or signed asset.

## Frontend Changes

- Merchant location form fields; QR print page; storefront about map section.

## Admin Changes

- None required.

## API Changes

- Store update includes geo.
- `GET /api/v1/stores/{id}/qr` (auth merchant)
- Public storefront profile includes map/nav DTOs.

## Security Considerations

- QR endpoint authZ to owning merchant.
- Do not expose internal map API keys to browser when avoidable (signed URL or server-rendered image).

## Edge Cases

- Missing map provider key in local → graceful address-only UI.
- Invalid coordinates rejected with Persian errors.

## Acceptance Criteria

- [ ] Store cannot activate without address + lat/lng.
- [ ] Storefront about shows map image or documented fallback + Navigate.
- [ ] Merchant can print QR that opens `/s/{slug}?src=qr`.
- [ ] Persian RTL print layout usable on A4/mobile.

## Rollout Plan

Ship with ADR-121 onboarding; storefront about wires in ADR-100.

## Dependencies

- ADR-006, ADR-081, ADR-091, ADR-093, ADR-094, ADR-100, ADR-121
- ADR-111 optional for QR asset persistence

## Risks

- Map provider ToS/keys in Iran network conditions.

## Related Documents

- `PRD.md` LOC-*, SF-12
- `docs/product/growth-loops-qr.md`

## Iranian User Experience Requirements

- Persian address entry; RTL; prefer Neshan-friendly nav options.
- uiuxpromax for QR print + about map sections.

## Estimated Complexity

**M**
