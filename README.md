# MerchantOS

**Iranian-native** Customer Retention Operating System for Local Retail.

Product requirements: [`PRD.md`](./PRD.md)  
Agent operating manual: [`AGENT.md`](./AGENT.md)  
Iranian First rule: [`docs/rules/iranian-first-development.md`](./docs/rules/iranian-first-development.md)  
Documentation system: [`docs/README.md`](./docs/README.md)  
Audit / gap analysis: [`AUDIT_REPORT.md`](./AUDIT_REPORT.md)  
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

Documentation / architecture contracts (ADR-001…091 in `adrs/done/`): **landed**  
Product-runtime wiring: **open** in `adrs/tasks/` — remaining product/infra gaps  
Composition root (ADR-123): `createAppContext` / `getApiContext` in [`src/infrastructure/composition`](./src/infrastructure/composition) — see [`docs/tech/composition-root.md`](./docs/tech/composition-root.md)

## Composition root (ops)

App Router handlers and the outbox worker obtain production adapters from **one** composition module:

- Production: `createAppContext()` / `getApiContext()` (Drizzle + Redis/Mongo/MinIO per env flags)
- Tests: `createApiContext({ repos: InMemory* })`
- Shared Drizzle factory: `createProductionRepositories` (also used by the worker)

Details, Next.js HMR pool caveat, and “how to add a module binding”: [`docs/tech/composition-root.md`](./docs/tech/composition-root.md).
