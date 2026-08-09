# Testing gap analysis

**Audit date:** 2026-08-09

---

## Inventory

| Layer | Approx. count | Pattern | Evidence |
| --- | ---: | --- | --- |
| Vitest unit/contract | ~135+ files / ~900+ tests | `*.test.ts(x)` under `src/` | `npm test` historically ~914 pass |
| Named integration | **3** | Gate on live `DATABASE_URL` | `drizzle-repositories.integration.test.ts`, `persian-roundtrip.integration.test.ts`, `create-app-context.integration.test.ts` |
| Playwright e2e | **1** | UI audit screenshots | `e2e/ui-audit.spec.ts` |

Pyramid is **inverted toward ADR contract packages** (`src/*-domain/index.test.ts`, architecture packages). Runtime modules also have solid unit tests (pos, ordering, payments, crm, catalog, inventory, accounting, erpnext).

---

## What is tested well

| Area | Evidence |
| --- | --- |
| POS CompleteSale domain + offline conflict rules | `src/modules/pos/index.test.ts`, `src/pos-offline/*` |
| Ordering lifecycle policies (pickup, delivery forbidden) | `src/modules/ordering/index.test.ts` |
| Payments sandbox domain | `src/modules/payments/index.test.ts` |
| RBAC matrix | `src/rbac/index.test.ts` |
| Accounting provider + ERP readiness guards | `accounting/index.test.ts`, `erpnext-accounting-provider.test.ts`, `erpnext-readiness.test.ts` |
| ErpNext finance ACL module (fake) | `src/modules/erpnext/index.test.ts` |
| Outbox retry/DLQ | `src/outbox/index.test.ts`, `workers/outbox-worker.test.ts` |
| Drizzle repository mapping (when DB up) | integration tests |

---

## Dangerous gaps (no / thin tests)

| Gap | Why dangerous | Suggested test |
| --- | --- | --- |
| OTP → session → POS sale → inventory → outbox → worker → ERP | Money + stock + books path | Playwright + staging ERPNext soak |
| Order paid → stock movement | **Production uses stub reserve** — regression easy to miss | Integration: markPaid must call real inventory port once wired |
| Real PSP webhooks | Only sandbox | Contract tests for ZarínPal/etc. adapter later |
| Multi-role staff on shared store | No employee SoT yet | Authz e2e when staff invites land |
| MinIO receipt from worker Compose | Env omission | Compose smoke |
| Tenant isolation fuzz | App-layer only | Abuse cases: cross-merchant ID in body |
| Manual sync retry UI | Thin | Component + API tests |
| Live ErpNextFinanceReader totals | Hardcoded AR/AP zero | Marked as placeholder — don't trust dashboard until tested live |

---

## CI behavior risk

- Integration tests **skip** without `DATABASE_URL` → CI can stay green with PG never exercised.
- No mandatory Playwright journey on critical money paths.
- ERPNext HTTP tests mock `fetch` — do not prove Desk connectivity.

---

## Coverage recommendation (MVP)

1. One Playwright: merchant OTP (or test bypass) → CompleteSale → assert stock + sale row.
2. One Playwright: storefront checkout sandbox confirm → order board transition.
3. One Compose/worker smoke: outbox publishes + DLQ visible.
4. Un-skip Postgres integration on CI with service container.
5. After inventory ports wired: force fail if stubs used when `MOS_ENV=production`.
