# MerchantOS Folder Structure Audit (Phase A)

| Metric | Value |
| --- | --- |
| Audit Date | 2026-08-17 |
| Current Top-Level `src/` Directories | 91 |
| Target Top-Level `src/` Directories | 9 (`modules`, `infrastructure`, `events`, `workers`, `shared`, `components`, `hooks`, `lib`, `types`) |
| Top-Level Files in `src/` | 2 (`auth.ts`, `auth.config.ts`) |
| Safety Principle | 100% preservation: 0 files deleted, 0 code modified, no behavioral or schema changes |

---

## 1. Executive Summary & Problem Analysis

During early ADR implementation phases, decisions were materialized as individual folders directly under `src/` (e.g., `src/backend-layering/`, `src/database-modeling/`, `src/redis-architecture/`, `src/rbac/`, etc.). While this preserved ADR contracts and tests, it caused significant architectural anomalies:

1. **Root Pollution**: 91 top-level directories in `src/` obscuring domain and infrastructure boundaries.
2. **Architecture Decisions Placed as Top-Level Packages**: Abstract guidelines (e.g. `src/shadcn-strategy`, `src/testing-strategy`, `src/nextjs-architecture`) existed alongside domain code.
3. **Cross-Layer Import Pollution**: Client components indirectly imported server packages via barrel files (e.g. `permissions-provider.tsx` -> `src/rbac` -> `src/multi-tenant-isolation` -> `src/database-modeling` -> `src/drizzle-orm-strategy` pulling `node:fs`).
4. **Fragmentation of Domain Concepts**: For example, `src/pos-offline`, `src/pos-sales`, `src/staff-pwa` were disconnected from `src/modules/pos/`.

---

## 2. Target Architecture Model

```text
kasbino/
├── app/
│   ├── (admin)/
│   ├── (auth)/
│   ├── (customer)/
│   ├── (merchant)/
│   ├── (storefront)/
│   └── api/
│
├── src/
│   ├── modules/                      # Business domain bounded contexts (DDD)
│   │   ├── accounting/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── audit/
│   │   ├── catalog/
│   │   ├── crm/
│   │   ├── customer-identity/
│   │   ├── erpnext/
│   │   ├── expenses/
│   │   ├── identity/
│   │   ├── inventory/
│   │   ├── inventory_costing/
│   │   ├── inventory_operations/
│   │   ├── loyalty/
│   │   ├── marketing/
│   │   ├── merchant/
│   │   ├── notifications/
│   │   ├── ordering/
│   │   ├── payments/
│   │   ├── platform/
│   │   ├── pos/
│   │   ├── purchase/
│   │   ├── realtime/
│   │   ├── reports/
│   │   ├── returns/
│   │   ├── store/
│   │   ├── storefront/
│   │   ├── supplier/
│   │   └── treasury/
│   │
│   ├── infrastructure/               # Technical infrastructure & external clients
│   │   ├── auth/
│   │   ├── composition/
│   │   ├── database/
│   │   ├── emqx/
│   │   ├── http/
│   │   ├── minio/
│   │   ├── mongodb/
│   │   ├── persistence/
│   │   ├── readiness/
│   │   ├── redis/
│   │   └── security/
│   │
│   ├── events/                       # Cross-cutting event contracts & outbox
│   │   ├── contracts/
│   │   └── outbox/
│   │
│   ├── workers/                      # Background runtimes (outbox worker)
│   ├── shared/                       # Kernel, shared VOs, contracts, errors, state
│   ├── components/                   # UI components
│   ├── hooks/                        # React hooks
│   ├── lib/                          # Utilities (cn, etc.)
│   ├── types/                        # Global type definitions
│   ├── auth.ts                       # NextAuth initialization
│   └── auth.config.ts                # NextAuth edge config
│
├── adrs/                             # Architecture decisions (done/tasks/future)
├── docs/                             # Architecture, product & guidelines documentation
├── scripts/                          # Tooling & setup scripts
└── e2e/                              # Playwright end-to-end tests
```

---

## 3. Complete Directory Inventory & Migration Mapping

Every directory currently in `src/` is audited below.

### 3.1. Core Directories (Retained at Top-Level)

| Current Path | Target Path | Files | Importers | Reason | Risk | Safe? |
| --- | --- | ---: | ---: | --- | --- | --- |
| `src/modules` | `src/modules` | 29 dirs | 100+ | DDD domain modules root | None | Yes |
| `src/infrastructure` | `src/infrastructure` | 11 dirs | 80+ | Technical infrastructure root | None | Yes |
| `src/shared` | `src/shared` | 10 files | 48 | Shared DDD kernel, money, phone, quantity | None | Yes |
| `src/components` | `src/components` | 50+ files | 60+ | React UI components | None | Yes |
| `src/hooks` | `src/hooks` | 10+ files | 20+ | Reusable React hooks | None | Yes |
| `src/lib` | `src/lib` | 5+ files | 30+ | Utility library | None | Yes |
| `src/types` | `src/types` | 1 file | 0 | Ambient TypeScript definitions | None | Yes |
| `src/workers` | `src/workers` | 5 files | 1 | Outbox worker runtime | None | Yes |

---

### 3.2. Domain Modules Consolidation (`src/modules/<domain>/`)

| Current Path | Target Path | Files | Importers | Reason | Risk | Safe? |
| --- | --- | ---: | ---: | --- | --- | --- |
| `src/admin-dashboard` | `src/modules/admin/ui/dashboard` | 2 | 3 | Admin dashboard UI contracts (ADR-084) | Low | Yes |
| `src/admin-domain` | `src/modules/admin/domain/contracts` | 2 | 1 | Admin domain contract (ADR-012) | Low | Yes |
| `src/mgmt-dashboard-analytics` | `src/modules/admin/ui/analytics` | 2 | 2 | Management dashboard analytics (ADR-089) | Low | Yes |
| `src/catalog-domain` | `src/modules/catalog/domain/contracts` | 2 | 1 | Catalog domain contract (ADR-007) | Low | Yes |
| `src/search-barcode` | `src/modules/catalog/domain/search-barcode` | 2 | 3 | Search and barcode scanning strategy (ADR-050) | Low | Yes |
| `src/crm-membership` | `src/modules/crm/domain/membership` | 2 | 2 | CRM membership contract (ADR-088) | Low | Yes |
| `src/customer-auth` | `src/modules/customer-identity/domain/auth` | 2 | 2 | Customer auth contract (ADR-082) | Low | Yes |
| `src/customer-dashboard` | `src/modules/customer-identity/ui/dashboard` | 2 | 2 | Customer dashboard contract (ADR-085) | Low | Yes |
| `src/merchant-auth` | `src/modules/identity/domain/merchant-auth` | 2 | 2 | Merchant auth contract (ADR-080) | Low | Yes |
| `src/inventory-domain` | `src/modules/inventory/domain/contracts` | 2 | 1 | Inventory domain contract (ADR-008) | Low | Yes |
| `src/inventory-sync` | `src/modules/inventory/application/sync` | 2 | 1 | Inventory sync contract (ADR-057) | Low | Yes |
| `src/loyalty-domain` | `src/modules/loyalty/domain/contracts` | 2 | 1 | Loyalty domain contract (ADR-010) | Low | Yes |
| `src/merchant-dashboard` | `src/modules/merchant/ui/dashboard` | 2 | 2 | Merchant dashboard UI contract (ADR-083) | Low | Yes |
| `src/merchant-domain` | `src/modules/merchant/domain/contracts` | 2 | 2 | Merchant domain contract (ADR-005) | Low | Yes |
| `src/notifications-architecture` | `src/modules/notifications/domain/contracts` | 2 | 2 | Notifications architecture contract (ADR-087) | Low | Yes |
| `src/ordering-domain` | `src/modules/ordering/domain/contracts` | 2 | 1 | Ordering domain contract (ADR-009) | Low | Yes |
| `src/pickup-only` | `src/modules/ordering/domain/pickup-only` | 2 | 1 | Pickup-only policy contract (ADR-016) | Low | Yes |
| `src/payments-domain` | `src/modules/payments/domain/contracts` | 2 | 1 | Payments domain contract (ADR-011) | Low | Yes |
| `src/pos-offline` | `src/modules/pos/offline` | 6 | 4 | POS offline queue & client runtime (ADR-073/105/126) | Medium | Yes |
| `src/pos-sales` | `src/modules/pos/domain/sales` | 2 | 2 | POS sales contract (ADR-079) | Low | Yes |
| `src/staff-pwa` | `src/modules/pos/ui/staff-pwa` | 2 | 4 | Merchant staff PWA contract (ADR-022) | Low | Yes |
| `src/merchant-oltp-analytics` | `src/modules/analytics/domain/merchant-oltp` | 2 | 1 | Merchant OLTP analytics contract (ADR-090) | Low | Yes |
| `src/product-analytics` | `src/modules/analytics/domain/product` | 2 | 2 | Product analytics contract (ADR-059) | Low | Yes |
| `src/session-analytics` | `src/modules/analytics/domain/session` | 2 | 3 | Session analytics contract (ADR-061) | Low | Yes |
| `src/qr-acquisition` | `src/modules/storefront/domain/qr-acquisition` | 2 | 3 | QR acquisition contract (ADR-081) | Low | Yes |
| `src/store-customer-pwa` | `src/modules/storefront/ui/customer-pwa` | 2 | 3 | Store customer PWA contract (ADR-023) | Low | Yes |
| `src/store-domain` | `src/modules/store/domain/contracts` | 2 | 2 | Store domain contract (ADR-006) | Low | Yes |
| `src/store-location` | `src/modules/store/domain/location` | 5 | 3 | Store location nav & map (ADR-104) | Low | Yes |
| `src/storefront-architecture` | `src/modules/storefront/domain/contracts` | 2 | 2 | Storefront architecture contract (ADR-086) | Low | Yes |

---

### 3.3. Infrastructure Consolidation (`src/infrastructure/<tech>/`)

| Current Path | Target Path | Files | Importers | Reason | Risk | Safe? |
| --- | --- | ---: | ---: | --- | --- | --- |
| `src/database-modeling` | `src/infrastructure/database/contracts/modeling` | 2 | 6 | DB modeling standards (ADR-043) | Low | Yes |
| `src/data-integrity` | `src/infrastructure/database/contracts/data-integrity` | 2 | 3 | Data integrity contract (ADR-047) | Low | Yes |
| `src/data-retention` | `src/infrastructure/database/contracts/retention` | 2 | 2 | Data retention policy (ADR-062) | Low | Yes |
| `src/drizzle-orm-strategy` | `src/infrastructure/database/contracts/drizzle-strategy` | 2 | 5 | Drizzle ORM strategy (ADR-042) | Low | Yes |
| `src/indexing-standards` | `src/infrastructure/database/contracts/indexing` | 2 | 3 | Indexing standards (ADR-044) | Low | Yes |
| `src/migration-strategy` | `src/infrastructure/database/contracts/migration-strategy` | 2 | 3 | Migration strategy (ADR-046) | Low | Yes |
| `src/postgresql-architecture` | `src/infrastructure/database/contracts/postgresql-architecture` | 2 | 2 | PostgreSQL architecture (ADR-040) | Low | Yes |
| `src/query-design-standards` | `src/infrastructure/database/contracts/query-design` | 2 | 4 | Query design standards (ADR-045) | Low | Yes |
| `src/cache-aside` | `src/infrastructure/redis/cache-aside` | 4 | 3 | Cache-aside port & store (ADR-052) | Low | Yes |
| `src/cache-invalidation` | `src/infrastructure/redis/cache-invalidation` | 2 | 2 | Cache invalidation contract (ADR-053) | Low | Yes |
| `src/cache-keys` | `src/infrastructure/redis/cache-keys` | 2 | 4 | Cache key standards (ADR-054) | Low | Yes |
| `src/redis-architecture` | `src/infrastructure/redis/contracts` | 2 | 9 | Redis architecture contract (ADR-051) | Low | Yes |
| `src/emqx-realtime` | `src/infrastructure/emqx/contracts` | 2 | 2 | EMQX realtime contract (ADR-068) | Low | Yes |
| `src/realtime-client` | `src/infrastructure/emqx/realtime-client` | 10 | 4 | Realtime MQTT client (ADR-039/124) | Medium | Yes |
| `src/minio-storage` | `src/infrastructure/minio/contracts` | 3 | 5 | MinIO storage contract (ADR-070/111) | Low | Yes |
| `src/analytics-boundaries` | `src/infrastructure/mongodb/contracts/boundaries` | 2 | 2 | Dual DB analytics boundary (ADR-041) | Low | Yes |
| `src/analytics-ingest-isolation` | `src/infrastructure/mongodb/contracts/ingest-isolation` | 2 | 2 | Ingest isolation contract (ADR-064) | Low | Yes |
| `src/clickstream` | `src/infrastructure/mongodb/clickstream` | 2 | 2 | Clickstream telemetry (ADR-060) | Low | Yes |
| `src/mongodb-analytics` | `src/infrastructure/mongodb/contracts/analytics` | 2 | 3 | MongoDB analytics warehouse (ADR-069) | Low | Yes |
| `src/api-protection` | `src/infrastructure/security/contracts/api-protection` | 2 | 4 | API protection contract (ADR-077) | Low | Yes |
| `src/audit-logging` | `src/infrastructure/security/contracts/audit-logging` | 2 | 2 | Audit logging contract (ADR-058) | Low | Yes |
| `src/rate-limiting` | `src/infrastructure/security/rate-limiting` | 4 | 9 | Rate limiting port & store (ADR-055) | Low | Yes |
| `src/rbac` | `src/infrastructure/security/rbac` | 3 | 20 | RBAC authorization model (ADR-034) | Medium | Yes |
| `src/security-architecture` | `src/infrastructure/security/contracts/architecture` | 2 | 2 | Security architecture (ADR-076) | Low | Yes |
| `src/nextauth-jwt` | `src/infrastructure/auth/contracts/nextauth-jwt` | 2 | 2 | NextAuth JWT contract (ADR-037) | Low | Yes |

---

### 3.4. Cross-Cutting Events (`src/events/`)

| Current Path | Target Path | Files | Importers | Reason | Risk | Safe? |
| --- | --- | ---: | ---: | --- | --- | --- |
| `src/event-driven` | `src/events/contracts/event-driven` | 2 | 2 | Event-driven architecture (ADR-065) | Low | Yes |
| `src/event-naming` | `src/events/contracts/event-naming` | 2 | 2 | Event naming standards (ADR-066) | Low | Yes |
| `src/event-warehouse` | `src/events/contracts/event-warehouse` | 2 | 2 | Event warehouse ingestion (ADR-063) | Low | Yes |
| `src/outbox` | `src/events/outbox` | 2 | 3 | Outbox pattern contract (ADR-048) | Low | Yes |

---

### 3.5. Shared Contracts, Architecture & State (`src/shared/`)

| Current Path | Target Path | Files | Importers | Reason | Risk | Safe? |
| --- | --- | ---: | ---: | --- | --- | --- |
| `src/api-standards` | `src/shared/contracts/api-standards` | 2 | 4 | API standards (ADR-038) | Low | Yes |
| `src/app-router-structure` | `src/shared/contracts/app-router-structure` | 2 | 2 | App router structure (ADR-017) | Low | Yes |
| `src/backend-layering` | `src/shared/contracts/backend-layering` | 2 | 3 | Clean architecture layering (ADR-004) | Low | Yes |
| `src/bounded-contexts` | `src/shared/contracts/bounded-contexts` | 2 | 2 | Bounded contexts map (ADR-003) | Low | Yes |
| `src/cicd-strategy` | `src/shared/contracts/cicd-strategy` | 2 | 2 | CI/CD pipeline strategy (ADR-075) | Low | Yes |
| `src/containerization` | `src/shared/contracts/containerization` | 2 | 2 | Containerization strategy (ADR-067) | Low | Yes |
| `src/data-fetching` | `src/shared/contracts/data-fetching` | 2 | 2 | Data fetching strategy (ADR-024) | Low | Yes |
| `src/docker-compose-parity` | `src/shared/contracts/docker-compose-parity` | 2 | 2 | Compose parity contract (ADR-072) | Low | Yes |
| `src/env-secrets` | `src/shared/contracts/env-secrets` | 2 | 2 | Environment secrets contract (ADR-074) | Low | Yes |
| `src/forms-validation` | `src/shared/validation/forms` | 2 | 2 | Forms & validation contract (ADR-026) | Low | Yes |
| `src/frontend-components` | `src/shared/contracts/frontend-components` | 2 | 2 | Frontend component strategy (ADR-018) | Low | Yes |
| `src/frontend-error-ux` | `src/shared/errors` | 3 | 4 | Frontend errors & Persian UX (ADR-027) | Low | Yes |
| `src/governance` | `src/shared/contracts/governance` | 2 | 2 | Architecture governance (ADR-095) | Low | Yes |
| `src/modular-monolith` | `src/shared/contracts/modular-monolith` | 2 | 2 | Modular monolith contract (ADR-002) | Low | Yes |
| `src/multi-tenant-isolation` | `src/shared/contracts/multi-tenant-isolation` | 2 | 6 | Multi-tenant isolation contract (ADR-049) | Low | Yes |
| `src/mvp-policies` | `src/shared/contracts/mvp-policies` | 2 | 2 | MVP policies contract (ADR-091) | Low | Yes |
| `src/nextjs-architecture` | `src/shared/contracts/nextjs-architecture` | 2 | 2 | Next.js architecture (ADR-014) | Low | Yes |
| `src/product-architecture` | `src/shared/architecture/product` | 2 | 31 | Product architecture contract (ADR-001) | Low | Yes |
| `src/scalability-stateless` | `src/shared/contracts/scalability-stateless` | 2 | 0 | Scalability stateless contract (ADR-071) | Low | Yes |
| `src/scope-guardrails` | `src/shared/contracts/scope-guardrails` | 2 | 1 | Scope guardrails (ADR-015) | Low | Yes |
| `src/shadcn-strategy` | `src/shared/contracts/shadcn-strategy` | 2 | 0 | shadcn/ui strategy (ADR-019) | Low | Yes |
| `src/state-management` | `src/shared/state` | 4 | 4 | State management stores (ADR-025) | Low | Yes |
| `src/tailwind-design-system` | `src/shared/contracts/tailwind-design-system` | 2 | 0 | Tailwind design system (ADR-020) | Low | Yes |
| `src/testing-strategy` | `src/shared/contracts/testing-strategy` | 2 | 0 | Testing strategy contract (ADR-078) | Low | Yes |
| `src/uiuxpromax-gate` | `src/shared/contracts/uiuxpromax-gate` | 2 | 22 | uiuxpromax mandatory gate (ADR-021) | Low | Yes |

---

## 4. Safety & Verification Summary

1. **Total directories audited**: 91.
2. **Total target directories retained at top-level of `src/`**: 9 (`modules`, `infrastructure`, `events`, `workers`, `shared`, `components`, `hooks`, `lib`, `types`).
3. **Files to be deleted**: **0**.
4. **Code to be modified**: **Only import paths** updating to reflect moved file locations.
5. **No schema/migration modifications**.
6. **No API route URL changes**.
