# ADR-155 — Offline POS Queue and Background Sync Runtime

| Field | Value |
| --- | --- |
| ID | ADR-155 |
| Status | `Accepted` |
| Date | 2026-08-10 |
| Folder | `adrs/done/` |

## Status

`Accepted` — Implementation-ready runtime gap ADR.

## Title

Offline POS Queue and Background Sync Runtime

## Context

The PRD mandates an "Offline sale queue + background sync when connectivity returns" (POS-08, NFR-07) as a P1 requirement. ADR-024 defined the offline-first strategy (conflict = reject-and-review).

## Completion Criteria

- [x] IndexedDB queue captures sales when offline.
- [x] Background sync successfully replays sales to the backend upon reconnection.
- [x] UI accurately reflects offline state and sync progress.
- [x] Persian RTL offline banners and reject-and-review notices.
