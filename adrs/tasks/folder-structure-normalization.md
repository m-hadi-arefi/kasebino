# ADR Task: Folder Structure Normalization

| Field | Value |
| --- | --- |
| Task Name | Folder Structure Normalization |
| Status | In Planning |
| Target Release | Core Architecture Maintenance |
| Phase | Phase B Migration Plan |

---

## 1. Context and Problem Statement

The repository grew to 91 top-level directories under `src/` because ADR decision contracts were initially created as top-level directories named after ADRs (e.g. `src/database-modeling`, `src/redis-architecture`, `src/rbac`, `src/pos-offline`).

This refactor normalizes `src/` to a clean architecture with only 9 top-level directories:
- `src/modules/`
- `src/infrastructure/`
- `src/events/`
- `src/workers/`
- `src/shared/`
- `src/components/`
- `src/hooks/`
- `src/lib/`
- `src/types/`
(Plus root files `src/auth.ts`, `src/auth.config.ts`)

---

## 2. Migration Table

| Current Path | Target Path | Reason | Risk | Dependencies |
| ------------ | ----------- | ------ | ---- | ------------ |
| `src/modules` | `src/modules` | Root for domain bounded contexts | None | None |
| `src/infrastructure` | `src/infrastructure` | Root for technical infrastructure implementations | None | None |
| `src/shared` | `src/shared` | Shared kernel (DDD, VOs) | None | None |
| `src/components` | `src/components` | UI components | None | None |
| `src/hooks` | `src/hooks` | React hooks | None | None |
| `src/lib` | `src/lib` | Utility library | None | None |
| `src/types` | `src/types` | TypeScript type declarations | None | None |
| `src/workers` | `src/workers` | Background worker runtimes | None | None |
| `src/admin-dashboard` | `src/modules/admin/ui/dashboard` | Admin dashboard UI contracts (ADR-084) | Low | `src/modules/admin` |
| `src/admin-domain` | `src/modules/admin/domain/contracts` | Admin domain contract (ADR-012) | Low | `src/modules/admin` |
| `src/mgmt-dashboard-analytics` | `src/modules/admin/ui/analytics` | Management dashboard analytics (ADR-089) | Low | `src/modules/admin` |
| `src/catalog-domain` | `src/modules/catalog/domain/contracts` | Catalog domain contract (ADR-007) | Low | `src/modules/catalog` |
| `src/search-barcode` | `src/modules/catalog/domain/search-barcode` | Search and barcode scanning strategy (ADR-050) | Low | `src/modules/catalog` |
| `src/crm-membership` | `src/modules/crm/domain/membership` | CRM membership contract (ADR-088) | Low | `src/modules/crm` |
| `src/customer-auth` | `src/modules/customer-identity/domain/auth` | Customer auth contract (ADR-082) | Low | `src/modules/customer-identity` |
| `src/customer-dashboard` | `src/modules/customer-identity/ui/dashboard` | Customer dashboard contract (ADR-085) | Low | `src/modules/customer-identity` |
| `src/merchant-auth` | `src/modules/identity/domain/merchant-auth` | Merchant auth contract (ADR-080) | Low | `src/modules/identity` |
| `src/inventory-domain` | `src/modules/inventory/domain/contracts` | Inventory domain contract (ADR-008) | Low | `src/modules/inventory` |
| `src/inventory-sync` | `src/modules/inventory/application/sync` | Inventory sync contract (ADR-057) | Low | `src/modules/inventory` |
| `src/loyalty-domain` | `src/modules/loyalty/domain/contracts` | Loyalty domain contract (ADR-010) | Low | `src/modules/loyalty` |
| `src/merchant-dashboard` | `src/modules/merchant/ui/dashboard` | Merchant dashboard UI contract (ADR-083) | Low | `src/modules/merchant` |
| `src/merchant-domain` | `src/modules/merchant/domain/contracts` | Merchant domain contract (ADR-005) | Low | `src/modules/merchant` |
| `src/notifications-architecture` | `src/modules/notifications/domain/contracts` | Notifications architecture contract (ADR-087) | Low | `src/modules/notifications` |
| `src/ordering-domain` | `src/modules/ordering/domain/contracts` | Ordering domain contract (ADR-009) | Low | `src/modules/ordering` |
| `src/pickup-only` | `src/modules/ordering/domain/pickup-only` | Pickup-only policy contract (ADR-016) | Low | `src/modules/ordering` |
| `src/payments-domain` | `src/modules/payments/domain/contracts` | Payments domain contract (ADR-011) | Low | `src/modules/payments` |
| `src/pos-offline` | `src/modules/pos/offline` | POS offline queue & client runtime (ADR-073/105/126) | Medium | `src/modules/pos` |
| `src/pos-sales` | `src/modules/pos/domain/sales` | POS sales contract (ADR-079) | Low | `src/modules/pos` |
| `src/staff-pwa` | `src/modules/pos/ui/staff-pwa` | Merchant staff PWA contract (ADR-022) | Low | `src/modules/pos` |
| `src/merchant-oltp-analytics` | `src/modules/analytics/domain/merchant-oltp` | Merchant OLTP analytics contract (ADR-090) | Low | `src/modules/analytics` |
| `src/product-analytics` | `src/modules/analytics/domain/product` | Product analytics contract (ADR-059) | Low | `src/modules/analytics` |
| `src/session-analytics` | `src/modules/analytics/domain/session` | Session analytics contract (ADR-061) | Low | `src/modules/analytics` |
| `src/qr-acquisition` | `src/modules/storefront/domain/qr-acquisition` | QR acquisition contract (ADR-081) | Low | `src/modules/storefront` |
| `src/store-customer-pwa` | `src/modules/storefront/ui/customer-pwa` | Store customer PWA contract (ADR-023) | Low | `src/modules/storefront` |
| `src/store-domain` | `src/modules/store/domain/contracts` | Store domain contract (ADR-006) | Low | `src/modules/store` |
| `src/store-location` | `src/modules/store/domain/location` | Store location nav & map (ADR-104) | Low | `src/modules/store` |
| `src/storefront-architecture` | `src/modules/storefront/domain/contracts` | Storefront architecture contract (ADR-086) | Low | `src/modules/storefront` |
| `src/database-modeling` | `src/infrastructure/database/contracts/modeling` | DB modeling standards (ADR-043) | Low | `src/infrastructure/database` |
| `src/data-integrity` | `src/infrastructure/database/contracts/data-integrity` | Data integrity contract (ADR-047) | Low | `src/infrastructure/database` |
| `src/data-retention` | `src/infrastructure/database/contracts/retention` | Data retention policy (ADR-062) | Low | `src/infrastructure/database` |
| `src/drizzle-orm-strategy` | `src/infrastructure/database/contracts/drizzle-strategy` | Drizzle ORM strategy (ADR-042) | Low | `src/infrastructure/database` |
| `src/indexing-standards` | `src/infrastructure/database/contracts/indexing` | Indexing standards (ADR-044) | Low | `src/infrastructure/database` |
| `src/migration-strategy` | `src/infrastructure/database/contracts/migration-strategy` | Migration strategy (ADR-046) | Low | `src/infrastructure/database` |
| `src/postgresql-architecture` | `src/infrastructure/database/contracts/postgresql-architecture` | PostgreSQL architecture (ADR-040) | Low | `src/infrastructure/database` |
| `src/query-design-standards` | `src/infrastructure/database/contracts/query-design` | Query design standards (ADR-045) | Low | `src/infrastructure/database` |
| `src/cache-aside` | `src/infrastructure/redis/cache-aside` | Cache-aside port & store (ADR-052) | Low | `src/infrastructure/redis` |
| `src/cache-invalidation` | `src/infrastructure/redis/cache-invalidation` | Cache invalidation contract (ADR-053) | Low | `src/infrastructure/redis` |
| `src/cache-keys` | `src/infrastructure/redis/cache-keys` | Cache key standards (ADR-054) | Low | `src/infrastructure/redis` |
| `src/redis-architecture` | `src/infrastructure/redis/contracts` | Redis architecture contract (ADR-051) | Low | `src/infrastructure/redis` |
| `src/emqx-realtime` | `src/infrastructure/emqx/contracts` | EMQX realtime contract (ADR-068) | Low | `src/infrastructure/emqx` |
| `src/realtime-client` | `src/infrastructure/emqx/realtime-client` | Realtime MQTT client (ADR-039/124) | Medium | `src/infrastructure/emqx` |
| `src/minio-storage` | `src/infrastructure/minio/contracts` | MinIO storage contract (ADR-070/111) | Low | `src/infrastructure/minio` |
| `src/analytics-boundaries` | `src/infrastructure/mongodb/contracts/boundaries` | Dual DB analytics boundary (ADR-041) | Low | `src/infrastructure/mongodb` |
| `src/analytics-ingest-isolation` | `src/infrastructure/mongodb/contracts/ingest-isolation` | Ingest isolation contract (ADR-064) | Low | `src/infrastructure/mongodb` |
| `src/clickstream` | `src/infrastructure/mongodb/clickstream` | Clickstream telemetry (ADR-060) | Low | `src/infrastructure/mongodb` |
| `src/mongodb-analytics` | `src/infrastructure/mongodb/contracts/analytics` | MongoDB analytics warehouse (ADR-069) | Low | `src/infrastructure/mongodb` |
| `src/api-protection` | `src/infrastructure/security/contracts/api-protection` | API protection contract (ADR-077) | Low | `src/infrastructure/security` |
| `src/audit-logging` | `src/infrastructure/security/contracts/audit-logging` | Audit logging contract (ADR-058) | Low | `src/infrastructure/security` |
| `src/rate-limiting` | `src/infrastructure/security/rate-limiting` | Rate limiting port & store (ADR-055) | Low | `src/infrastructure/security` |
| `src/rbac` | `src/infrastructure/security/rbac` | RBAC authorization model (ADR-034) | Medium | `src/infrastructure/security` |
| `src/security-architecture` | `src/infrastructure/security/contracts/architecture` | Security architecture (ADR-076) | Low | `src/infrastructure/security` |
| `src/nextauth-jwt` | `src/infrastructure/auth/contracts/nextauth-jwt` | NextAuth JWT contract (ADR-037) | Low | `src/infrastructure/auth` |
| `src/event-driven` | `src/events/contracts/event-driven` | Event-driven architecture (ADR-065) | Low | `src/events` |
| `src/event-naming` | `src/events/contracts/event-naming` | Event naming standards (ADR-066) | Low | `src/events` |
| `src/event-warehouse` | `src/events/contracts/event-warehouse` | Event warehouse ingestion (ADR-063) | Low | `src/events` |
| `src/outbox` | `src/events/outbox` | Outbox pattern contract (ADR-048) | Low | `src/events` |
| `src/api-standards` | `src/shared/contracts/api-standards` | API standards (ADR-038) | Low | `src/shared` |
| `src/app-router-structure` | `src/shared/contracts/app-router-structure` | App router structure (ADR-017) | Low | `src/shared` |
| `src/backend-layering` | `src/shared/contracts/backend-layering` | Clean architecture layering (ADR-004) | Low | `src/shared` |
| `src/bounded-contexts` | `src/shared/contracts/bounded-contexts` | Bounded contexts map (ADR-003) | Low | `src/shared` |
| `src/cicd-strategy` | `src/shared/contracts/cicd-strategy` | CI/CD pipeline strategy (ADR-075) | Low | `src/shared` |
| `src/containerization` | `src/shared/contracts/containerization` | Containerization strategy (ADR-067) | Low | `src/shared` |
| `src/data-fetching` | `src/shared/contracts/data-fetching` | Data fetching strategy (ADR-024) | Low | `src/shared` |
| `src/docker-compose-parity` | `src/shared/contracts/docker-compose-parity` | Compose parity contract (ADR-072) | Low | `src/shared` |
| `src/env-secrets` | `src/shared/contracts/env-secrets` | Environment secrets contract (ADR-074) | Low | `src/shared` |
| `src/forms-validation` | `src/shared/validation/forms` | Forms & validation contract (ADR-026) | Low | `src/shared` |
| `src/frontend-components` | `src/shared/contracts/frontend-components` | Frontend component strategy (ADR-018) | Low | `src/shared` |
| `src/frontend-error-ux` | `src/shared/errors` | Frontend errors & Persian UX (ADR-027) | Low | `src/shared` |
| `src/governance` | `src/shared/contracts/governance` | Architecture governance (ADR-095) | Low | `src/shared` |
| `src/modular-monolith` | `src/shared/contracts/modular-monolith` | Modular monolith contract (ADR-002) | Low | `src/shared` |
| `src/multi-tenant-isolation` | `src/shared/contracts/multi-tenant-isolation` | Multi-tenant isolation contract (ADR-049) | Low | `src/shared` |
| `src/mvp-policies` | `src/shared/contracts/mvp-policies` | MVP policies contract (ADR-091) | Low | `src/shared` |
| `src/nextjs-architecture` | `src/shared/contracts/nextjs-architecture` | Next.js architecture (ADR-014) | Low | `src/shared` |
| `src/product-architecture` | `src/shared/architecture/product` | Product architecture contract (ADR-001) | Low | `src/shared` |
| `src/scalability-stateless` | `src/shared/contracts/scalability-stateless` | Scalability stateless contract (ADR-071) | Low | `src/shared` |
| `src/scope-guardrails` | `src/shared/contracts/scope-guardrails` | Scope guardrails (ADR-015) | Low | `src/shared` |
| `src/shadcn-strategy` | `src/shared/contracts/shadcn-strategy` | shadcn/ui strategy (ADR-019) | Low | `src/shared` |
| `src/state-management` | `src/shared/state` | State management stores (ADR-025) | Low | `src/shared` |
| `src/tailwind-design-system` | `src/shared/contracts/tailwind-design-system` | Tailwind design system (ADR-020) | Low | `src/shared` |
| `src/testing-strategy` | `src/shared/contracts/testing-strategy` | Testing strategy contract (ADR-078) | Low | `src/shared` |
| `src/uiuxpromax-gate` | `src/shared/contracts/uiuxpromax-gate` | uiuxpromax mandatory gate (ADR-021) | Low | `src/shared` |

---

## 3. Migration Sequence

1. **Step 1 — Directory Relocation**: Move files from old paths to target paths under `src/modules/`, `src/infrastructure/`, `src/events/`, and `src/shared/`.
2. **Step 2 — Import Path Updates**: Update all relative and `@/*` imports across `src/`, `app/`, and tests to point directly to the normalized locations.
3. **Step 3 — tsconfig & Config Verification**: Ensure `tsconfig.json`, `tsconfig.contracts.json`, and `drizzle.config.ts` are intact and aligned.
4. **Step 4 — Validation**: Run `typecheck`, `lint`, and test suite (`npm run validate`).
5. **Step 5 — Build Verification**: Verify `next build` passes.
6. **Step 6 — Governance & Documentation**: Update `AGENT.md` and create `docs/architecture/folder-structure.md`.
