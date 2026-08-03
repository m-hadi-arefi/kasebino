# ARD-025 — Management Dashboards

| Field | Value |
| --- | --- |
| ID | ARD-025 |
| Title | Management Dashboards |
| Status | `todo` |
| Milestone | M5 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | analytics-requirements.md |

## Objective

Build platform management dashboards for activation, engagement, commerce proxies, reliability, and trust & safety — for platform admins (not merchant ARD-013/016).

## Business Value

Operate the SaaS portfolio and detect growth or risk early.

## Requirements

- PA-07
- Platform metrics from PRD (DAM/MAM, GMV proxies, activation)

## Dependencies

- ARD-021, ARD-023, ARD-024
- ARD-018 Admin Panel shell

## Architecture

Read Mongo `mos_mgmt` rollups + selective PostgreSQL aggregates for financial truth. Freshness tiers per management-dashboards-architecture.md.

## Domain Model

Read models / rollup jobs only.

## API Contracts

| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/mgmt/overview` |
| GET | `/api/v1/admin/mgmt/activation` |
| GET | `/api/v1/admin/mgmt/engagement` |

## Events

- `MgmtRollupUpdated`

## Persistence Strategy

### PostgreSQL + Drizzle

Source for money/activation truth queries when required.

### MongoDB

`mos_mgmt` hourly/daily rollups from warehouse + product events.

## Database Design

Rollup keys: `{period, metric, merchantId?}`; indexes on period+metric.

### Caching Plan

Redis TTL 60–900s on mgmt widgets.

## Security

`platform_admin` only; access audited (ARD-022).

## Analytics / Audit / Tracking Requirements

- Analytics: rollup inputs from warehouse/product streams
- Audit: dashboard admin access
- Tracking: optional DashboardWidgetViewed
- Metrics: activation rate, DAM/MAM, GMV proxy, OTP success, checkout p95

## UI Requirements

- **uiuxpromax REQUIRED**

## Testing

AuthZ negative tests; freshness SLA documentation.

## Acceptance Criteria

- [ ] Overview renders for admin
- [ ] Activation + engagement widgets live
- [ ] Standard freshness SLA documented and met
- [ ] Money figures labeled with source (PG vs proxy)

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
- Reports: Persian labels + Jalali/`Asia/Tehran` buckets for humans.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + management dashboard architecture.

## Implementation Checklist

- [x] Read analytics pack architectures
- [ ] uiuxpromax admin dashboards
- [x] Rollup foundations (`src/mgmt-dashboard-analytics`, ADR-062) — live jobs + HTTP remain
- [ ] Tests + STATUS

> **ADR-062 (2026-08-03):** Foundation landed — `mos_mgmt` portfolio aggregates, platform_admin + audited access, DAM/MAM/GMV instrument notes (GMV proxy reconciles to PG), Persian titles/labels, freshness SLAs, overview/activation/engagement builders (in-memory). Remaining for ARD-025: HTTP routes, uiuxpromax widgets, live Mongo rollup jobs.

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] lint / typecheck / tests
- [ ] authZ + tenant isolation for any merchant drill-down

## Completion Protocol

Update STATUS + progress-log.
