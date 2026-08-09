# ADR-148: Inventory Movement History API and Merchant UI

| Field | Value |
| --- | --- |
| ID | ADR-148 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #10 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

`stock_movements` ledger is written on adjust/sale paths, but merchants only see balance + `updatedAt`. No history API/UI — auditability gap for Iranian retail ops.

## Current State

- Schema: `stock_movements` (`schema/inventory.ts`)
- Repo: append + `listByReference` — no store/product timeline query used by HTTP
- UI: `app/(merchant)/inventory/inventory-client.tsx`
- Tests: `stock-movements.test.ts`

## Decision

Add list movements by store (and optional productId) with pagination; Persian merchant history drawer/page; Jalali timestamps; reason codes shown in FA.

## Scope

Included:

- Repository list by store/product + createdAt cursor
- `GET /api/v1/inventory/movements`
- Merchant UI history panel
- RBAC inventory view permission

Excluded:

- Warehouse multi-bin
- ERP valuation reports
- Editing historical movements (immutable)

## Technical Design

### Database

- Ensure index `(merchant_id, store_id, created_at desc)` — add if missing in migration

### Backend

- UC `listStockMovements`
- Map movement types to Persian labels in presentation layer

### Frontend

- Inventory row → «تاریخچه» sheet with table RTL

## Implementation Plan

1. Index + repo query.
2. API + authz.
3. UI + brief.
4. Tests.

## Data Model Changes

Tables: none (index only if needed)  
Fields: none  
Indexes: composite time index  
Relations: none

## API Changes

Routes: `GET /api/v1/inventory/movements?storeId&productId&cursor&limit`  
Response: `{ items: [{ id, productId, delta, reason, referenceType, referenceId, createdAt }], nextCursor }`

## Frontend Changes

Pages: inventory  
Components: movements sheet  
User flows: adjust → see movement row

## Testing Requirements

Unit: query filters  
Integration: append then list  
E2E: optional

## Acceptance Criteria

- [ ] Merchant sees movements for a product after adjust and after POS sale
- [ ] Cross-tenant access denied
- [ ] Jalali/Persian presentation
- [ ] Pagination stable

## Dependencies

Required before: stock_movements write path (done)  
Depends on: none  
Synergy: ADR-142 ensures online orders also create movements

## Migration / Rollout Plan

Read-only API — safe anytime.
