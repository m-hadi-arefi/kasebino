# FRONTEND COMPLETION AUDIT

**Date:** 2026-08-29  
**Surface:** Merchant staff app (`app/(merchant)/`) — ADR-022  
**Covering ADR:** ADR-155 (`adrs/tasks/` → `done/` when accepted)

Statuses used in this document:

| Tag | Meaning |
| --- | --- |
| COMPLETE | Real API + usable merchant UI |
| PARTIAL | API and/or UI incomplete or honesty-gated |
| MISSING | No merchant surface |
| BROKEN | Compile/runtime failure (none found at audit start) |
| MOCKED | Hardcoded UI; not production data |
| UNUSED BACKEND | Handler/UC exists; App Router and/or UI missing |
| BACKEND GAP | No production backend — do not fake in FE |
| IMPLEMENTED / FIXED / IMPROVED / BLOCKED / N/A | Post-sprint outcome tags |

---

## 1. Backend capabilities discovered

Auth (merchant OTP + NextAuth JWT), RBAC (`merchant.*`, `store.*`, `pos.sale`, `crm.*`, `loyalty.*`, `inventory.*`, `pickup.manage`, `finance.*`, `purchase.*`, `supplier.view`, `admin.platform`), merchants/onboarding, stores (incl. hours PATCH, QR, assets), catalog (+ image upload/delete handlers), inventory balance/adjust (+ list movements handler), POS/sales/sync/receipts, pickup orders, storefront customer APIs, CRM/memberships/segments/follow-ups/tags, loyalty rules/wallets/redeem, payments (sandbox), analytics AN-01…04, notifications, realtime token, ERPNext/accounting finance reads, staff invites/roles, admin merchants/audit.

**Stub / non-production HTTP:** purchases, suppliers, expenses, returns, treasury, `/reports/summary` (in-memory / weak auth).

---

## 2. Frontend capabilities discovered (pre-sprint)

| Area | Routes | Status |
| --- | --- | --- |
| Login / onboarding | `/login`, `/onboarding` | COMPLETE |
| Dashboard | `/dashboard` | PARTIAL (live AN-01…04; shallow UI) |
| POS | `/pos` | COMPLETE |
| Products | `/products`, `/new`, `/[id]` | PARTIAL (no image UI; handlers exist) |
| Inventory | `/inventory` | PARTIAL (adjust only; movements UNUSED) |
| Customers / CRM | `/customers*`, `/crm*` | COMPLETE APIs; CRM weak nav |
| Orders | `/orders` | COMPLETE |
| Loyalty | `/loyalty` | COMPLETE |
| Finance | `/finance*` | PARTIAL (honesty banners; fake/noop common) |
| Staff | `/staff` | COMPLETE |
| Stores | `/stores*` | PARTIAL (no hours UI) |
| Notifications | `/notifications` | COMPLETE |
| Purchases / suppliers / expenses / treasury / reports / returns | orphan routes | MOCKED |

---

## 3. Backend → frontend coverage matrix

| Backend capability | API | Frontend | Status (start) | Outcome |
| --- | --- | --- | --- | --- |
| Merchant OTP auth | `/api/v1/auth/otp/*` | `/login` | COMPLETE | N/A |
| Onboarding | `/merchants/me/onboarding*` | `/onboarding` | COMPLETE | N/A |
| Analytics overview/revenue/customers/retention | `/analytics/merchant/*` | `/dashboard` | PARTIAL | IMPROVED (redesign) |
| Catalog CRUD | `/catalog/products*` | `/products*` | COMPLETE | N/A |
| Product images | handlers upload/delete | — | UNUSED BACKEND | FIXED (route + UI) |
| Inventory list/adjust | `/inventory`, `/adjust` | `/inventory` | COMPLETE | N/A |
| Stock movements | `handleListStockMovements` | — | UNUSED BACKEND | FIXED (route + UI) |
| Store hours | PATCH store `hours` | — | UNUSED BACKEND | FIXED (UI) |
| CRM memberships / segments / follow-ups | `/crm/*`, `/customers*` | pages exist | PARTIAL IA | IMPROVED (nav links) |
| Pickup orders | `/orders*` | `/orders` | COMPLETE | IMPROVED (dashboard strip) |
| Loyalty rules | `/loyalty/rules` | `/loyalty` | COMPLETE | N/A |
| Finance reads | `/accounting`, `/erpnext/finance*` | `/finance*` | PARTIAL | IMPROVED (fake honesty) |
| Staff / roles | `/staff*`, `/roles*` | `/staff` | COMPLETE | N/A |
| Notifications | `/notifications*` | `/notifications` | COMPLETE | N/A |
| Purchases / suppliers / expenses / treasury / returns / Phase reports | stub APIs | mock pages | MOCKED + BACKEND GAP | FIXED (de-surfaced) |

---

## 4. Missing capabilities implemented

- `GET /api/v1/inventory/movements` App Router + inventory history UI
- `POST|DELETE /api/v1/catalog/products/[id]/image` App Router + product form image upload/delete
- Store hours editor at `/stores/[id]/hours`
- CRM discoverability links under مشتریان
- Dashboard redesign (trend from `revenue.days[]`, operational strips)
- Mock ERP-ops pages replaced with honest unavailable gate

---

## 5. Dashboard redesign summary

Hero KPIs from overview/revenue; compact RTL revenue trend from `days[]`; customer segments; open pickup counts; low-stock from inventory `reorderLevel`; Persian/Jalali/تومان; no fabricated finance KPIs when reader is fake.

---

## 6. Major UX improvements

RTL/Persian consistency; empty/loading/error states on new flows; mock data removed from product surface; finance fake source no longer presents zeros as books.

---

## 7. Major architecture improvements

Thin App Router routes wired to existing handlers; catalog/store UI clients extended; no new ORM/domains; ADR-155 covering contract.

---

## 8. Remaining backend gaps

Production PSP (ADR-143/084), production SMS (115), real purchases/suppliers/expenses/treasury/returns OLTP, inventory reserve for online orders, coupons, multi-bin warehouses, live ERPNext soak.

---

## 9. Remaining frontend gaps

Storefront/admin polish out of scope; deep branding editor; POS hardware; product image binary GET proxy (upload status + object key only for merchant MVP); hierarchical categories.

---

## 10. Technical debt discovered

Stale `docs/audit/capability-matrix.md` rows (staff/images/hours/movements); orphan mock pages; ADR-147/148 marked done without App Router files.

---

## 11. Tests added

- `src/modules/catalog/ui/index.test.ts` — image/movements Persian copy (ADR-155)
- `src/modules/analytics/ui/index.test.ts` — trend/ops copy
- `src/modules/store/ui/index.test.ts` — hours weekday copy Sat–Fri
- Existing HTTP handler tests for movements/images still green

---

## 12. Validation / build results

| Gate | Result |
| --- | --- |
| Focused vitest (catalog/analytics/store UI + http handlers) | PASS |
| ESLint on ADR-155 FE surfaces | PASS (after removing invalid next img rule disable) |
| `npm run typecheck` (contracts) | Pre-existing exactOptionalPropertyTypes errors outside ADR-155 scope |
| `npm run build` | Targeted lint blockers fixed for green compile path |

Outcome tags: UNUSED BACKEND for images/movements/hours → **FIXED**; dashboard → **IMPROVED**; mock ERP-ops → **FIXED** (de-surfaced); purchases stack → **BACKEND GAP**.
