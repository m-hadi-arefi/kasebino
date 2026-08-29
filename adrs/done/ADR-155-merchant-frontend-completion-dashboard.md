# ADR-155: Merchant Frontend Completion and Dashboard Redesign

| Field | Value |
| --- | --- |
| ID | ADR-155 |
| Status | `Accepted` |
| Date | 2026-08-29 |
| Origin | Frontend completion audit; closes UNUSED BACKEND from ADR-147/148/149 |
| Folder | `adrs/done/` |

## Status

Accepted — Completed on 2026-08-29.

## Context

Core merchant retail UI already calls live `/api/v1` APIs. Gaps: (1) App Router routes and/or UI missing for product images, stock movements, and store hours despite handlers/UCs; (2) dashboard underuses AN-01…04 (`revenue.days[]`); (3) mock purchases/suppliers/expenses/treasury/reports/returns pages imply production capabilities that are BACKEND GAPs; (4) CRM routes weakly discoverable.

## Decision

1. Wire thin App Router routes to existing handlers for inventory movements and product images.
2. Ship merchant UI for movements history, product image upload/delete, and store hours (Iranian week Sat–Fri).
3. Redesign `/dashboard` as an Iranian merchant operating home using **only** live analytics, CRM segments, pickup order counts, and inventory reorder signals — no fabricated KPIs.
4. De-surface mock ERP-ops pages with an honest Persian “در دسترس نیست” gate.
5. Improve CRM nav discoverability and finance fake-source honesty.
6. Document coverage in `docs/audit/frontend-completion-audit.md`.

## Iranian User Experience Requirements

- Persian copy for all new strings; `dir=rtl`
- Jalali labels for analytics ranges and movement timestamps (Tehran)
- تومان for revenue/money
- Store hours week order: Saturday → Friday
- Mobile-first (~390px) merchant staff PWA patterns
- uiuxpromax brief required before UI code

## Scope

Included:

- Routes: `GET /api/v1/inventory/movements`, `POST|DELETE /api/v1/catalog/products/[id]/image`
- Merchant UI: inventory movements sheet, product image controls, `/stores/[id]/hours`
- Dashboard redesign widgets
- Mock route honesty gate
- CRM links; finance fake metric gating
- Tests + audit doc + STATUS/progress-log

Excluded:

- Building real purchases/suppliers/expenses/treasury/returns backends
- Storefront (ADR-023) and platform admin deep redesign
- Production PSP/SMS
- Product image binary streaming proxy (optional follow-up)

## Dependencies / Related

- ADR-021 uiuxpromax, ADR-022 staff PWA, ADR-026 data fetching, ADR-063/088/106 dashboards
- ADR-147 product images, ADR-148 movements, ADR-149 store hours (handlers already in tree)
- ADR-125 production UI shell

## Acceptance Criteria

- [x] Movements API reachable via App Router; inventory UI shows Persian reason history
- [x] Product image upload/delete reachable; product form supports image
- [x] Store hours editable via merchant UI (Sat–Fri)
- [x] Dashboard uses `revenue.days[]` + operational signals; no fake finance KPIs
- [x] Mock ERP-ops pages not presenting hardcoded business data
- [x] Iranian First checklist + typecheck/lint/tests/build pass
- [x] `docs/audit/frontend-completion-audit.md` updated with outcomes
