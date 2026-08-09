# Next development roadmap

**Audit date:** 2026-08-09  
Priorities from code gaps (see capability-matrix + incomplete-items).

---

## Critical (blocks honest production / data integrity)

### 1. Wire ordering ↔ inventory reserve/release

- **Problem:** Production `createOrderingUseCases` omits `inventoryReserve`/`inventoryRelease` → stubs no-op (`create-api-context.ts`, `ordering/application/ports.ts`). Online paid orders do not consume stock; cancel/refund do not restore.
- **Why important:** Over-selling; POS vs storefront stock diverge.
- **Affected files:** `create-api-context.ts`, `ordering/application/use-cases.ts`, `inventory/application/use-cases.ts` (`decrementForPickupPaid` / restore).
- **Complexity:** M
- **Solution:** Inject real adapters in composition; same-TX as `markPaid` when `txScope` present; integration tests; fail-closed if stubs in `MOS_ENV=production`.

### 2. Production payment gateway (Iranian PSP)

- **Problem:** Only `SandboxPaymentGateway` shipped (`payments/infrastructure/gateway`).
- **Why important:** Online checkout cannot take real money.
- **Affected files:** `src/modules/payments/**`, payment handlers, `.env.example`, future ADR-084 implementation.
- **Complexity:** L
- **Solution:** Implement PaymentGateway adapter + webhooks; keep sandbox env-gated; contract + sandbox e2e first.

### 3. Production SMS provider

- **Problem:** Console SMS forbidden outside local; real provider deferred (`adrs/future/ADR-115`).
- **Why important:** OTP login is the auth path for merchants and customers.
- **Affected files:** SMS factory / identity infrastructure, env guards.
- **Complexity:** M
- **Solution:** Land ADR-115 provider with failover + rate limits.

### 4. ERPNext dual-run soak (Sale → Invoice)

- **Problem:** Adapter exists but default `MOS_ACCOUNTING_PROVIDER=noop`; live soak not proven in CI.
- **Why important:** Finance claims are unsafe without posted invoices.
- **Affected files:** `.env`, `scripts/erpnext/*`, worker, provider projectors.
- **Complexity:** M (ops) + M (fixes found)
- **Solution:** Documented path: Wizard(IRR) → bootstrap → env → migrate → worker → CompleteSale → Desk assert + sync UI green.

---

## High (required soon for MVP ops)

### 5. Employee invite + role assignment

- **Problem:** RBAC matrix exists; no staff CRUD / store membership of employees.
- **Why important:** Cannot safely run cashier vs manager in field.
- **Affected files:** `identity`, new staff schema?, merchant UI, JWT claims issuance.
- **Complexity:** L
- **Solution:** Invite by phone OTP → assign `store_manager` / `store_employee` + store scopes.

### 6. Loyalty earn on online orders + kill coupon orphan or implement

- **Problem:** `earnPointsForOrder` unused; `coupons` table orphan.
- **Why important:** Inconsistent rewards; dead schema.
- **Affected files:** `loyalty/application/use-cases.ts`, ordering markPaid outbox, `schema/loyalty.ts`.
- **Complexity:** S–M
- **Solution:** Wire earn on OrderPaid path; either implement coupon MVP or drop table in migration.

### 7. Finance reader honesty + sync retry

- **Problem:** Live reader hardcodes AR/AP `0`, `profitOverview: null`, aliases today=month (`erpnext-finance-reader.ts`).
- **Why important:** Merchants misread fake books.
- **Affected files:** `erpnext-finance-reader.ts`, finance UI, sync retry API.
- **Complexity:** M
- **Solution:** Query ERP reports or hide KPIs until available; Persian “در دسترس نیست”; add retry for failed sync records.

### 8. CI Postgres + one Playwright money journey

- **Problem:** Integration skips without DB; one UI-audit e2e only.
- **Why important:** Regressions in sale/order paths.
- **Affected files:** CI workflow, `e2e/*`.
- **Complexity:** M
- **Solution:** Service containers + smoke specs.

---

## Medium (improvement)

### 9. Store hours HTTP + UI

- Domain exists; handler/UI gap.

### 10. Stock movement history API/UI

- Ledger writes exist; merchants cannot audit.

### 11. Product images

- Catalog MVP competitiveness.

### 12. Migration meta hygiene (`0003`/`0005` snapshots)

- Protect future `drizzle-kit generate`.

### 13. Worker Compose MinIO env parity

- Receipt consumer reliability.

### 14. Catalog cost/tax fields (or explicit ERP ownership UX)

- Needed before accurate invoices/tax if not only in ERPNext.

---

## Low (future)

### 15. Variants / brands / hierarchical categories

### 16. Printer / cash drawer / real card terminal

### 17. Delivery (explicit non-goal — keep forbidden)

### 18. Purchasing / AP / valuation / P&amp;L (ERPNext phases 5–7)

### 19. Observability / DR / zero-downtime CD (future ADRs)

### 20. PostgreSQL RLS

---

## Recommended next 10 tasks (ordered)

1. Wire ordering inventory ports + tests (Critical #1)  
2. Staging ERPNext dual-run CompleteSale → Sales Invoice (Critical #4)  
3. Hide or fix misleading finance KPIs (High #7)  
4. Employee invite + role claims (High #5)  
5. Production SMS provider ADR-115 (Critical #3)  
6. Iranian PSP adapter behind port (Critical #2)  
7. Loyalty online earn + coupons decision (High #6)  
8. Playwright POS + order smokes + CI Postgres (High #8)  
9. Stock history + store hours surfacing (Medium #9–10)  
10. Worker/MinIO + migration snapshot hygiene (Medium #12–13)
