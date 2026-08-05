# ADR-098 - CRM Profiles, History, Segments, and Membership Runtime

| Field | Value |
| --- | --- |
| ID | ADR-098 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

CRM Profiles, History, Segments, and Membership Runtime

## Context

CRM-01..04 and MEM-01..02 are P0. Membership domain exists; Drizzle membership adapter partially started; no merchant CRM pages; dashboard customer stats are stubs.

## Problem Statement

Merchants cannot view customers, purchase history, or segments; store-owned membership is not operable as a product surface.

## Goals

- Merchant CRM list/profile/history/segments.
- POS phone capture and customer OTP join create/link durable store memberships.
- Soft-delete exclusion on default lists.

## Non Goals

- Cross-merchant customer marketplace.
- Manual bulk CRM import tools (unless needed for pilot seed only).

## Functional Requirements

- FR-1: Profile shows identity, contact, engagement stats (CRM-01).
- FR-2: Purchase history per membership (CRM-02).
- FR-3: Segments new / returning / lapsed (CRM-03).
- FR-4: Customer stats on merchant dashboard widgets (CRM-04; shared with ADR-106).
- FR-5: MEM-01/02 membership first-class; POS + customer OTP join paths.

## Technical Design

1. `StoreMembership` aggregate as SoT for store customers (ADR-007).
2. Sale completion upserts membership (POS port).
3. Segment computation from completed sales windows (document definitions in code comments + tests).
4. Merchant UI under `/customers` (uiuxpromax + ADR-114).

## Database Changes

- Uses `store_memberships` + sales history queries (indexes per ADR-044).

## Backend Changes

- Finish Drizzle membership repo; CRM APIs; segment query services.

## Frontend Changes

- Persian RTL customer list, profile, history, segment filters.

## Admin Changes

- None (platform does not own store customers).

## API Changes

- `/api/v1/crm/memberships`, `/api/v1/crm/memberships/{id}`, history + segments endpoints.

## Security Considerations

- Store-scoped reads; phone treated as PII (minimize logs).
- Soft-delete + audit on membership delete (ADR-091).

## Edge Cases

- Same phone across multiple stores = separate memberships.
- Lapsed threshold definition documented and tested.
- Soft-deleted membership excluded from lists but retained for audit.

## Acceptance Criteria

- [ ] Merchant opens customer profile with purchase history.
- [ ] Segments update from sales without manual rebuild button requirement.
- [ ] Soft-deleted customers excluded from default lists.
- [ ] POS capture creates membership visible in CRM.

## Rollout Plan

Coordinate with ADR-096 POS capture and ADR-103 customer join.

## Dependencies

- ADR-007, ADR-093, ADR-094, ADR-095, ADR-096, ADR-106, ADR-114

## Risks

- Expensive history queries without proper indexes.

## Related Documents

- `PRD.md` CRM-*, MEM-*
- `docs/product/store-first-evolution.md`

## Iranian User Experience Requirements

- Persian labels; RTL; Jalali purchase dates; تومان totals.
- uiuxpromax before UI.

## Estimated Complexity

**L**
