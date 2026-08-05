# ADR-106 - Live Merchant and Admin Dashboard Analytics

| Field | Value |
| --- | --- |
| ID | ADR-106 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Live Merchant and Admin Dashboard Analytics

## Context

AN-01..04 are P0; ADM-01 is P1. `/dashboard` and `/admin/*` are Persian stubs. OLTP analytics and management dashboard packages are in-memory.

## Problem Statement

Merchants lack live overview/revenue/customer/retention dashboards including North Star; admin cannot activate/suspend merchants.

## Goals

- OLTP-backed merchant widgets (cache TTL 60s): overview, revenue, customer, retention.
- Compute Monthly Returning Customers (North Star).
- Admin merchant list/view/activate/suspend with audited actions.
- Platform rollups from Mongo when ADR-110 live (PA-07 P1 stretch OK after merchant AN).

## Non Goals

- Perfect real-time sub-second dashboards.
- Replacing OLTP dashboards with Mongo for merchant SoT metrics.

## Functional Requirements

- FR-1: AN-01..04 merchant dashboards.
- FR-2: ADM-01 activate/suspend.
- FR-3: Retention metric rolling 30-day returning customers.
- FR-4: Persian + Jalali widgets; تومان revenue.
- FR-5: Admin actions audited (ADR-058/110).
- FR-6: Fraud/abuse monitoring hooks stubs become queryable signals when telemetry lands (ADM-02 stretch).

## Technical Design

1. Projection counters/tables updated from `SaleCompleted` / order paid events.
2. Cache-aside 60s (ADR-108).
3. Admin APIs with `platform_admin` RBAC (ADR-113).
4. Replace hardcoded admin `sampleRows` with API data.

## Database Changes

- OLTP projection persistence via ADR-093 analytics projection repo (define tables if missing; migrate).

## Backend Changes

- Projection applicators; dashboard query APIs; admin merchant management APIs.

## Frontend Changes

- Live merchant dashboard widgets.
- Functional admin merchants table with activate/suspend.
- Admin audit page binds when audit query API ready.

## Admin Changes

- Primary surface for this ADR: merchants, security hooks shell, audit viewer wiring.

## API Changes

- `/api/v1/analytics/merchant/{overview|revenue|customers|retention}`
- `/api/v1/admin/merchants`, activate/suspend
- `/api/v1/admin/audit` (read)

## Security Considerations

- Tenant isolation on all merchant analytics queries (PA-11).
- Admin routes platform_admin only; audit admin mutations.

## Edge Cases

- Empty store / zero sales honest empty states.
- Timezone: use Asia/Tehran for Jalali day boundaries (document).

## Acceptance Criteria

- [ ] Dashboards reflect completed sales within cache TTL.
- [ ] Retention widget computes Monthly Returning Customers.
- [ ] Admin suspend blocks merchant access on next authZ check.
- [ ] Admin activate/suspend writes audit record.

## Rollout Plan

Merchant AN first; admin ADM-01 next; Mongo mgmt rollups after ADR-110.

## Dependencies

- ADR-062, ADR-063, ADR-093, ADR-094, ADR-095, ADR-098, ADR-109, ADR-110, ADR-113, ADR-114

## Risks

- Heavy aggregates on OLTP - keep projections.
- Jalali boundary mistakes skewing North Star.

## Related Documents

- `PRD.md` AN-*, ADM-*
- `docs/product/success-metrics.md`
- `docs/product/analytics-requirements.md`

## Iranian User Experience Requirements

- Persian + RTL dashboards; Jalali ranges; تومان.
- uiuxpromax before UI.

## Estimated Complexity

**XL**
