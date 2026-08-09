# MerchantOS

**Iranian-native** Customer Retention Operating System for Local Retail.

Product requirements: [`PRD.md`](./PRD.md)  
Agent operating manual: [`AGENT.md`](./AGENT.md)  
Iranian First rule: [`docs/rules/iranian-first-development.md`](./docs/rules/iranian-first-development.md)  
Documentation system: [`docs/README.md`](./docs/README.md)  
ERPNext integration (financial brain): [`docs/integrations/erpnext/`](./docs/integrations/erpnext/) · local Docker [`scripts/erpnext/README.md`](./scripts/erpnext/README.md)  
Audit / gap analysis (2026-08-09 code audit): [`docs/audit/`](./docs/audit/) · runtime ADR queue: [`adrs/tasks/INDEX.md`](./adrs/tasks/INDEX.md) · execution order: [`docs/architecture/adr-execution-order.md`](./docs/architecture/adr-execution-order.md) · historical snapshot: [`AUDIT_REPORT.md`](./AUDIT_REPORT.md)  
ADR board: [`adrs/STATUS.md`](./adrs/STATUS.md) · folders [`done/`](./adrs/done/) · [`future/`](./adrs/future/) · [`tasks/`](./adrs/tasks/)  
ARD delivery board: [`docs/ards/STATUS.md`](./docs/ards/STATUS.md)

## Autonomous development

This repository is prepared for AI-driven execution:

1. Read `AGENT.md` (includes Iranian First checks)
2. Run the **ard-to-code** skill against unfinished ADRs in **`adrs/tasks/`**
3. Repeat until `adrs/tasks/` is empty (ADRs moved to `adrs/done/`) or blocked

Bootstrap via **ard-to-code** using Critical path in [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) and the [`tasks/`](./adrs/tasks/) queue.  
**ADR `complete` (contract landed) ≠ ARD `completed` ≠ production-ready** (ADR-120).

## Status

Documentation / architecture contracts (ERPNext prep ADR-126…134): **landed**  
ERPNext role/boundary/mapping/sync/UI (ADR-135…139) + runtime adapter (ADR-140): **in `adrs/tasks/` with implementation in progress**  
Product-runtime wiring: **open** in `adrs/tasks/` — remaining product/infra gaps  
ERPNext local Docker + `ErpNextAccountingProvider`: **shipped** (enable via `MOS_ACCOUNTING_PROVIDER=erpnext`)  
Merchant finance UX (ADR-141): `/finance` + sync status + customer financial panel — **landed** (Fake reader when ERP not configured)  
Composition root (ADR-123): `createAppContext` / `getApiContext` in [`src/infrastructure/composition`](./src/infrastructure/composition) — see [`docs/tech/composition-root.md`](./docs/tech/composition-root.md)

## ERPNext Architecture Context

MerchantOS integrates with ERPNext as an **external ERP/accounting engine** (financial brain), not as the merchant/customer UI.

MerchantOS owns: retail experience, POS, storefront, CRM, loyalty, orders, operational stock.  
ERPNext owns: accounting, purchasing, financial reporting, tax books, inventory valuation.

- Never put ERPNext logic inside core domain.
- Never replace MerchantOS POS/UI with ERPNext Desk/Website.
- Integrate only via Outbox + `AccountingProvider` (`ErpNextAccountingProvider` under accounting infrastructure).
- Local: `npm run erpnext:up` → Setup Wizard → `npm run erpnext:bootstrap`.

## Composition root (ops)

App Router handlers and the outbox worker obtain production adapters from **one** composition module:

- Production: `createAppContext()` / `getApiContext()` (Drizzle + Redis/Mongo/MinIO per env flags)
- Tests: `createApiContext({ repos: InMemory* })`
- Shared Drizzle factory: `createProductionRepositories` (also used by the worker)

Details, Next.js HMR pool caveat, and “how to add a module binding”: [`docs/tech/composition-root.md`](./docs/tech/composition-root.md).
