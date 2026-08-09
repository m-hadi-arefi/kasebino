# ADR-149: Store Hours HTTP and Merchant UI

| Field | Value |
| --- | --- |
| ID | ADR-149 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #9 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

Store hours exist in domain + `stores.hours_json` + `updateHours` use-case, but HTTP update handler and merchant UI do not expose them. Storefront cannot reliably show working hours.

## Current State

- Domain: store hours model under `src/modules/store`
- UC: `updateHours`
- Column: `hours_json`
- HTTP: `handleUpdateStore` lacks hours (handlers merchants-stores)
- UI: location/QR pages only — no hours editor

## Decision

Expose hours on store GET/PATCH APIs and add Persian RTL hours editor on store settings/location flow; show hours on storefront about page.

## Scope

Included:

- API field `hours` on store update/get
- Merchant editor (weekly slots, closed days)
- Storefront display (Jalali-aware week labels in FA)

Excluded:

- Exception dates / holidays calendar v2
- Auto-close ordering by hours enforcement (optional follow-up)

## Technical Design

### Backend

- Extend update DTO validation (zod) for hours structure already in domain
- Wire handler → `updateHours`

### Frontend

- uiuxpromax brief; editor on `stores/[id]/location` or dedicated settings tab
- Storefront about consumes store payload hours

### Security

- Existing store manage permission

## Implementation Plan

1. Handler + validation tests.
2. UI editor.
3. Storefront display.
4. Optional: ordering rejects outside hours (flagged separate if product wants).

## Data Model Changes

None (column exists)

## API Changes

Routes: existing `PATCH /api/v1/stores/{id}` accepts `hours`  
Response: store includes `hours`

## Frontend Changes

Pages: merchant store location/settings; storefront about  
User flows: set hours → customer sees on about

## Testing Requirements

Unit: hours validation  
HTTP handler test  
UI unit if pattern exists

## Acceptance Criteria

- [ ] Hours persist via API
- [ ] Merchant UI edits hours RTL Persian
- [ ] Storefront about shows hours
- [ ] Invalid ranges rejected

## Dependencies

Required before: store domain hours (done)  
Depends on: none

## Migration / Rollout Plan

No migration.
