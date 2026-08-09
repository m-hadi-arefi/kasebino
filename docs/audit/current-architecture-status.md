# Current architecture status

**Audit date:** 2026-08-09  
**Method:** Inspected `app/`, `src/modules/`, `src/infrastructure/`, Compose, workers, tests.

---

## Application architecture

```
Next.js 15 App Router (React 19)
|
├── UI: app/(merchant|storefront|admin|marketing)/
│        + src/modules/*/ui + src/components
|
├── HTTP: app/api/v1/* → src/infrastructure/http/handlers/*
|
├── Composition root: src/infrastructure/composition/create-api-context.ts
│        createAppContext() / getApiContext()
|
├── Application services (use-cases per module)
|
├── Domain (aggregates, events, policies)
|
├── Ports → Repositories (Drizzle PG) | Gateways | Object storage
|
├── PostgreSQL (OLTP SoT) + transactional outbox
|
└── Workers: src/workers/outbox-worker.ts
         → EMQX publish, cache invalidate, receipts (MinIO),
           accounting provider, Mongo warehouse, scheduled jobs
```

| Layer | Reality |
| --- | --- |
| Framework | **Next.js 15** App Router (`package.json`), TypeScript ESM |
| Frontend | Route groups: merchant staff UI, customer storefront PWA, platform admin, marketing landing. TanStack Query + Zustand where used; shadcn/Radix under `src/components`. |
| Backend | Modular monolith — handlers thin; logic in `src/modules/*/application`. No separate Nest/Express service. |
| Module boundaries | Runtime modules: `identity`, `merchant`, `store`, `catalog`, `inventory`, `pos`, `crm`, `loyalty`, `ordering`, `payments`, `notifications`, `admin`, `analytics`, `customer-identity`, `accounting`, `erpnext`. Plus many ADR **contract packages** under `src/*-domain`, `src/*-architecture` (tests-as-docs). |
| Communication | Synchronous HTTP inside process. Cross-module side effects via **domain events → outbox → worker consumers**. Browser realtime via MQTT token (`/api/v1/realtime/token`) + EMQX. |

Evidence:

- Composition: `src/infrastructure/composition/create-api-context.ts`
- Handler index: `src/infrastructure/http/index.ts`
- Outbox worker: `src/workers/create-outbox-runtime.ts`
- ~90 App Router API routes under `app/api/v1/`

---

## Infrastructure

| Plane | Status | Evidence | Notes |
| --- | --- | --- | --- |
| **PostgreSQL + Drizzle** | **Implemented** | `docker-compose.yml` postgres:16; `src/infrastructure/database/`; migrations `0000`–`0005`; production repos in `create-production-repositories.ts` | No SQL FKs; RLS deferred (schema index comment ADR-048) |
| **Redis** | **Implemented** (degrades) | Compose redis:7; `create-redis-runtime.ts` | Memory mode when `REDIS_URL` absent / `MOS_REDIS_MODE=memory` |
| **MongoDB** | **Implemented** (analytics/audit) | Compose mongo:7; `create-mongo-runtime.ts` | Not OLTP SoT; optional readiness flag |
| **MinIO** | **Implemented** (degrades) | Compose MinIO; `create-minio-runtime.ts`; branding + receipts | Worker Compose profile may omit `MINIO_*` → memory fallback |
| **MQTT / EMQX** | **Implemented** | Compose EMQX; `src/infrastructure/mqtt/`; worker publisher | Not a job queue; realtime + side-effect fan-out |
| **Workers** | **Implemented** (opt-in) | `npm run worker:outbox`; Compose `worker` profile | Required for ERP sync, receipts, MQTT, warehouse, loyalty expiry, pickup timers |
| **Queues** | **Implemented** (PG outbox only) | `outbox_events`, `processed_events`, `outbox_dead_letters` | No Bull/SQS/Kafka |
| **Object storage** | **Implemented** | Same as MinIO | Receipt HTML keys on `sales` (migration `0003`) |
| **ERPNext sidecar** | **Partial** | `docker-compose.erpnext.yml`; `npm run erpnext:*` | Separate stack; adapter default **noop** until env set |

---

## Cross-cutting patterns (verified)

| Pattern | Status | Where |
| --- | --- | --- |
| UoW / TX for POS CompleteSale | Implemented | `repos.txScope.run` + outbox enqueue in same sale path |
| Idempotency keys | Implemented | `sales`, `orders`, `payments` unique indexes |
| RBAC permission matrix | Implemented | `src/rbac/index.ts` + handler gates |
| Tenant scoping | Partial | App-layer checks; no Postgres RLS |
| Iranian money/time | Implemented | IRR minor units; UTC storage; Persian/Jalali presentation in UI copy |

---

## Explicit non-architecture

- Not a microservices mesh.
- ERPNext Desk is **not** embedded; financial ACL is native MOS UI reading via MOS APIs (`src/modules/erpnext`).
- Delivery/courier domains correctly absent (pickup-only).
