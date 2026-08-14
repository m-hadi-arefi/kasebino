# ADR-149: Store Hours HTTP and Merchant UI

| Field | Value |
| --- | --- |
| ID | ADR-149 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #9 |
| Folder | `adrs/done/` |

## Status

Accepted — Completed on 2026-08-12.

## Context

Store hours existed in domain + `stores.hours_json` + `updateHours` use-case, but HTTP update handler and merchant UI did not expose them. Storefront could not reliably show working hours.

## Current State

- Domain: store hours model under `src/modules/store` (`StoreHours`).
- UC: `updateHours` domain use-case.
- Column: `hours_json` JSON column on `stores`.
- HTTP: `PATCH /api/v1/stores/{id}` updated to validate `hours` schedule and invoke `updateHours`.
- DTO: `storeDto` includes `hours` object.

## Decision

Exposed hours on store PATCH APIs (`updateStoreSchema` and `handleUpdateStore`); validated weekly schedule starting Saturday through Friday.

## Scope

Included:

- API field `hours` on store update (`PATCH /api/v1/stores/{id}`)
- `hours` in store response DTOs
- Weekly schedule validation (Saturday through Friday)
- Unit and HTTP integration tests

Excluded:

- Exception dates / holidays calendar v2
- Auto-close ordering by hours enforcement (optional follow-up)

## Acceptance Criteria Verified

- [x] Hours persist via API (`PATCH /api/v1/stores/{id}`)
- [x] Weekday structure aligns with Iranian calendar (Saturday to Friday)
- [x] DTO responses include `hours`
- [x] Invalid hours time ranges rejected
