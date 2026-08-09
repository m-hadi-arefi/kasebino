# Incomplete items (stubs, placeholders, unused)

**Audit date:** 2026-08-09  
Search: `TODO`/`FIXME` (~0 classic markers in `src`/`app`), plus structural stubs (`Stub`, `Fake`, `Noop`, schema “deferred”, unused use-cases).

---

## Production-impact stubs

| Item | Kind | Location | Impact |
| --- | --- | --- | --- |
| Inventory reserve/release | **Stub default** | `src/modules/ordering/application/ports.ts` `createStubInventory*`; composition does not override | Online orders do not move stock |
| Accounting provider default | **Noop** | `createAccountingProvider()` / `.env.example` `MOS_ACCOUNTING_PROVIDER=noop` | No ERP projection unless configured |
| Finance reader local default | **Fake / Unavailable** | `resolveFinanceReaderMode()` + `FakeFinanceReader` | Dashboard invents or zeros numbers |
| Payment gateway | **Sandbox only** | `SandboxPaymentGateway` in composition | Not real PSP |
| Security monitoring | **Noop** | `createNoopSecurityMonitoringPort` in `create-api-context.ts` | No fraud signal sink |
| Payment confirm stub (tests) | Stub | `createStubPaymentConfirmPort` | OK for tests; prod uses sandbox port |

---

## Schema / domain ahead of product

| Item | Location | Notes |
| --- | --- | --- |
| `coupons` table | `schema/loyalty.ts` | Comment: domain deferred; no repository |
| `merchant_settings` | `schema/merchants.ts` | Prefer `merchants.settings_json` |
| Product UOM columns | `schema/catalog.ts` | Not in catalog domain/UC |
| Membership `notes` | `store_memberships` | Repo hardcodes null |
| Purchase/return in AccountingProvider | Provider methods return unsupported | Explicit placeholder |

---

## Unwired use-cases / UC without HTTP

| Item | Evidence |
| --- | --- |
| `earnPointsForOrder` | Defined in loyalty UC; no callers outside definition |
| `decrementForPickupPaid` / restore | Inventory UC + tests; not called from composition ordering |
| Store `updateHours` | Domain/UC present; not in store HTTP update handler |

---

## UI / product placeholders

| Item | Evidence |
| --- | --- |
| Admin “به‌زودی” / deferred panels | Admin UI copy (security/fraud surfaces) |
| Finance AR/AP/profit | Live reader returns zeros/null (`erpnext-finance-reader.ts` L78–82) |
| Fee policy inactive | Payments fee always 0 |

---

## Fake / Noop types (intentional)

| Type | Role |
| --- | --- |
| `FakeAccountingProvider` | Tests / local recording without HTTP |
| `NoopAccountingProvider` | Default safe no side effects |
| `FakeFinanceReader` | Local UI development |
| `UnavailableFinanceReader` | Explicit disabled mode |

These are fine **if** env gates prevent mislabeling Fake data as production books.

---

## Classic TODO/FIXME

Essentially **absent** as comment debt. Incomplete work is encoded as stubs, future ADRs (`adrs/future/`, `adrs/tasks/` ERPNext set), and orphan schema — easier to miss than `TODO:`.

---

## Open ADR task queue (not automatically “missing code”)

At audit time `adrs/tasks/` still held ERPNext 135–141 (+ possibly ADR-125 shell migration). Code for 140/141 largely exists — treat task folder as **governance lag**, and verify against this audit rather than ADR folder alone.
