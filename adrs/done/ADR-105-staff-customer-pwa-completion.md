# ADR-105 - Staff and Store Customer PWA Completion

| Field | Value |
| --- | --- |
| ID | ADR-105 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Staff and Store Customer PWA Completion

## Context

Staff and store customer manifests + install prompts exist; staff SW precaches `/pos`; customer SW missing; offline sale queue not end-to-end; manifests not fully backed by live store branding.

## Problem Statement

PWAs are install chrome without complete staff offline path or branded customer install experience (SF-13).

## Goals

- Staff PWA: installable POS with offline queue + background sync (POS-08 P1) using reject-and-review conflicts (ADR-024/091).
- Store customer PWA: per-store manifest (name/icons/theme/start_url) from live branding; installable.
- Never conflate staff vs customer PWAs (ADR-022/023).

## Non Goals

- Full offline storefront checkout.
- Desktop-native POS hardware suite.

## Functional Requirements

- FR-1: Staff SW caches POS shell; queues CompleteSale payloads when offline; syncs when online.
- FR-2: Conflict on stock shortage = reject-and-review UX.
- FR-3: Customer per-store manifest from branding; start_url `/s/{slug}`.
- FR-4: Install prompts remain Persian; icons per store when uploaded (ADR-111).

## Technical Design

1. Extend `public/sw-staff.js` + IndexedDB queue; sync tag posts to POS API with idempotency keys.
2. Customer SW optional online-first (if added, keep thin - no auth secrets in SW).
3. Manifest routes already present - bind to store settings API data.
4. Feature-detect `beforeinstallprompt`; iOS A2HS instructions in Persian.

## Database Changes

- None specific; branding fields from stores.

## Backend Changes

- Idempotent offline sync acceptance on POS API.
- Manifest endpoint reads live store branding.

## Frontend Changes

- Offline queue status with actionable failures.
- Customer install UX polish; branded icons.

## Admin Changes

- None.

## API Changes

- POS sale endpoint must honor idempotency for SW replay.
- Manifest stays route handlers under staff/storefront.

## Security Considerations

- SW must not store JWT in insecure plain IDB without threat review; prefer Background Sync with credentialed fetch cookies.
- Separate scopes for staff vs store SW.

## Edge Cases

- Partial sync failures.
- Store branding change after install (next launch updates manifest).
- iOS Safari install limitations messaging.

## Acceptance Criteria

- [ ] Staff PWA installable; offline sale queued and syncs when online on seed stock.
- [ ] Stock conflict surfaces reject-and-review, no silent overwrite.
- [ ] Customer PWA installable per store with store name/theme.
- [ ] Staff and customer manifests/start URLs remain distinct.

## Rollout Plan

Online POS P0 first (ADR-096); offline P1 after.

## Dependencies

- ADR-022, ADR-023, ADR-024, ADR-091, ADR-096, ADR-100, ADR-111, ADR-114

## Risks

- Browser Background Sync support uneven on Iranian Android WebViews.

## Related Documents

- `PRD.md` NFR-06/07, SF-13, POS-08
- `docs/product/growth-loops-store-pwa.md`

## Iranian User Experience Requirements

- Persian install/offline copy; RTL banners.
- Touch-friendly offline CTAs.

## Estimated Complexity

**L**
