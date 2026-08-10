# ADR-155 — Offline POS Queue and Background Sync Runtime

| Field | Value |
| --- | --- |
| ID | ADR-155 |
| Status | `Proposed` |
| Date | 2026-08-10 |
| Folder | `adrs/tasks/` |

## Status

`Proposed` — Implementation-ready runtime gap ADR.

## Title

Offline POS Queue and Background Sync Runtime

## Context

The PRD mandates an "Offline sale queue + background sync when connectivity returns" (POS-08, NFR-07) as a P1 requirement. ADR-024 defined the offline-first strategy (conflict = reject-and-review). However, the POS merchant UI currently lacks IndexedDB storage, a service worker for background sync, and the necessary offline UI states.

## Problem Statement

Without the runtime implementation of the offline POS queue, merchants in areas with flaky connectivity (Kerman pilot) will be blocked from processing checkout, violating a core resilience requirement.

## Goals

- Implement IndexedDB (IDB) storage for the POS cart and offline sales queue.
- Implement a Service Worker to intercept requests and background sync queued sales.
- Surface offline/online status and queue progress in the POS UI.

## Non Goals

- Changing the conflict resolution strategy (remains reject-and-review per ADR-024).
- Offline product catalog search (stretch goal; POS online-first is P0).

## Functional Requirements

- FR-1: POS UI must detect `navigator.onLine` and display an offline badge.
- FR-2: When offline, `CompleteSale` writes to IndexedDB instead of failing.
- FR-3: Service worker or application mount logic replays the IDB queue to `POST /api/v1/sales/sync` when connectivity returns.
- FR-4: Sync failures (e.g., stock shortage) surface a notification to the merchant for review.

## Technical Design

1. Integrate `idb` or `localforage` in `app/(merchant)/pos/pos-register.tsx`.
2. Register a Service Worker (`sw.js`) with Workbox or custom sync logic.
3. Ensure idempotent sync API (`/api/v1/sales/sync`) processes batched offline sales safely.

## Dependencies

- ADR-024 (Offline-First Staff POS Strategy)
- ADR-096 (Merchant POS UI Complete Sale)

## Iranian User Experience Requirements

- Offline banners and sync failure notifications must use Persian copy (e.g., "اتصال به اینترنت قطع شد. فاکتورها در صف ذخیره شدند.").

## Completion Criteria

- [ ] IndexedDB queue captures sales when offline.
- [ ] Background sync successfully replays sales to the backend upon reconnection.
- [ ] UI accurately reflects offline state and sync progress.
