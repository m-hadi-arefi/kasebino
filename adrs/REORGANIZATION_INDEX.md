# ADR Reorganization Index

| Field | Value |
| --- | --- |
| Generated | 2026-08-03 |
| Revised | 2026-08-03 — reclassified with **contract/domain/tests** DoD (user-confirmed) |
| Report | [`AUDIT_REPORT.md`](../AUDIT_REPORT.md) |

## Classification rules

- **done/** — ADR decision realized as contracts + domain modules + tests (`ard-to-code`). ARD/HTTP/migration may still be open.
- **future/** — No meaningful ADR implementation yet (ops ADRs 070–075, 079–080; Proposed vendors 083–084).
- **tasks/** — Audit-generated ADRs for remaining **product/runtime** wiring.

## Summary counts

| Bucket | Count |
| --- | ---: |
| done | 81 |
| future | 10 |
| tasks | 30 |

## done/

| File |
| --- |
| `ADR-001-product-architecture.md` |
| `ADR-002-ddd-strategy.md` |
| `ADR-003-bounded-contexts.md` |
| `ADR-004-modular-monolith.md` |
| `ADR-005-merchant-domain.md` |
| `ADR-006-store-domain.md` |
| `ADR-007-customer-membership-domain.md` |
| `ADR-008-catalog-inventory-domain.md` |
| `ADR-009-pos-sales-domain.md` |
| `ADR-010-loyalty-domain.md` |
| `ADR-011-order-pickup-domain.md` |
| `ADR-012-payment-domain.md` |
| `ADR-013-admin-domain.md` |
| `ADR-014-analytics-domain-boundaries.md` |
| `ADR-015-scope-guardrails.md` |
| `ADR-016-nextjs-architecture.md` |
| `ADR-017-app-router-structure.md` |
| `ADR-018-component-architecture.md` |
| `ADR-019-shadcn-ui.md` |
| `ADR-020-tailwind-design-system.md` |
| `ADR-021-uiuxpromax-governance.md` |
| `ADR-022-merchant-staff-pwa.md` |
| `ADR-023-store-customer-pwa.md` |
| `ADR-024-offline-first-staff-pos.md` |
| `ADR-025-state-management.md` |
| `ADR-026-data-fetching.md` |
| `ADR-027-forms-validation.md` |
| `ADR-028-frontend-error-ux.md` |
| `ADR-029-backend-layering.md` |
| `ADR-030-api-standards.md` |
| `ADR-031-merchant-authentication.md` |
| `ADR-032-customer-sms-otp.md` |
| `ADR-033-nextauth-jwt.md` |
| `ADR-034-authorization-rbac.md` |
| `ADR-035-outbox-workers.md` |
| `ADR-036-event-driven-architecture.md` |
| `ADR-037-event-catalog-governance.md` |
| `ADR-038-emqx-realtime.md` |
| `ADR-039-mqtt-client-strategy.md` |
| `ADR-040-minio-storage.md` |
| `ADR-041-postgresql-architecture.md` |
| `ADR-042-drizzle-orm.md` |
| `ADR-043-database-modeling.md` |
| `ADR-044-indexing-standards.md` |
| `ADR-045-query-design.md` |
| `ADR-046-drizzle-migrations.md` |
| `ADR-047-data-integrity.md` |
| `ADR-048-multi-tenant-isolation.md` |
| `ADR-049-inventory-synchronization.md` |
| `ADR-050-search-barcode.md` |
| `ADR-051-redis-architecture.md` |
| `ADR-052-cache-aside.md` |
| `ADR-053-cache-keys-ttl.md` |
| `ADR-054-cache-invalidation.md` |
| `ADR-055-rate-limiting.md` |
| `ADR-056-mongodb-analytics-plane.md` |
| `ADR-057-event-warehouse.md` |
| `ADR-058-audit-logging.md` |
| `ADR-059-product-analytics.md` |
| `ADR-060-behavior-clickstream.md` |
| `ADR-061-session-analytics.md` |
| `ADR-062-management-dashboard-analytics.md` |
| `ADR-063-merchant-oltp-dashboards.md` |
| `ADR-064-data-retention.md` |
| `ADR-065-analytics-failure-isolation.md` |
| `ADR-066-docker-compose.md` |
| `ADR-067-containerization.md` |
| `ADR-068-env-secrets.md` |
| `ADR-069-cicd.md` |
| `ADR-076-security-architecture.md` |
| `ADR-077-api-protection.md` |
| `ADR-078-testing-strategy.md` |
| `ADR-081-qr-acquisition.md` |
| `ADR-082-pickup-only-fulfillment.md` |
| `ADR-085-adr-ard-governance.md` |
| `ADR-086-storefront-architecture.md` |
| `ADR-087-customer-dashboard.md` |
| `ADR-088-merchant-dashboard.md` |
| `ADR-089-admin-dashboard.md` |
| `ADR-090-notifications.md` |
| `ADR-091-mvp-product-policy-resolutions.md` |
| `ADR-135-erpnext-role.md` |
| `ADR-136-erpnext-boundary.md` |
| `ADR-137-erpnext-data-mapping.md` |
| `ADR-138-erpnext-sync-architecture.md` |
| `ADR-139-erpnext-ui-strategy.md` |
| `ADR-142-ordering-inventory-wiring.md` |

## future/ (not implemented)

| File | Why still future |
| --- | --- |
| `ADR-070-deployment-zero-downtime.md` | No CD / rolling deploy implementation |
| `ADR-071-scalability-stateless.md` | No multi-instance topology wiring |
| `ADR-072-data-plane-deployment.md` | No prod data-plane topology |
| `ADR-073-backup-dr.md` | No backup/DR jobs |
| `ADR-074-observability.md` | No OTEL/metrics runtime |
| `ADR-075-monitoring-alerting.md` | No alerting |
| `ADR-079-testing-layers.md` | No e2e/perf layers beyond contract vitest |
| `ADR-080-error-handling.md` | Cross-cutting runtime strategy not implemented |
| `ADR-083-sms-provider.md` | Proposed — vendor not chosen |
| `ADR-084-payment-psp.md` | Proposed — PSP not chosen |

## tasks/ (runtime gaps)

| File |
| --- |
| `ADR-092-drizzle-kit-migrations.md` |
| `ADR-093-drizzle-repositories.md` |
| `ADR-094-http-api-v1-surface.md` |
| `ADR-095-nextauth-app-router-wiring.md` |
| `ADR-096-merchant-pos-ui-complete-sale.md` |
| `ADR-097-catalog-inventory-merchant-apis-ui.md` |
| `ADR-098-crm-membership-merchant-ui.md` |
| `ADR-099-loyalty-engine-runtime.md` |
| `ADR-100-storefront-pickup-checkout.md` |
| `ADR-101-pickup-order-lifecycle-board.md` |
| `ADR-102-payments-http-psp.md` |
| `ADR-103-customer-otp-portal.md` |
| `ADR-104-store-location-maps-qr.md` |
| `ADR-105-staff-customer-pwa-completion.md` |
| `ADR-106-merchant-admin-dashboards-live.md` |
| `ADR-107-notifications-center.md` |
| `ADR-108-redis-cache-rate-limit-runtime.md` |
| `ADR-109-outbox-worker-emqx-mqtt.md` |
| `ADR-110-mongodb-analytics-runtime.md` |
| `ADR-111-minio-receipts-assets.md` |
| `ADR-112-readiness-probe-api-ready.md` |
| `ADR-113-rbac-route-enforcement.md` |
| `ADR-114-shadcn-ui-component-library.md` |
| `ADR-115-sms-provider-production.md` |
| `ADR-116-observability-monitoring-runtime.md` |
| `ADR-117-e2e-perf-testing-layers.md` |
| `ADR-118-production-deploy-dr.md` |
| `ADR-119-security-hardening-runtime.md` |
| `ADR-120-adr-status-truth-realignment.md` |
| `ADR-121-merchant-onboarding-store-setup.md` |
| `ADR-140-erpnext-runtime-adapter.md` |
| `ADR-141-erpnext-capability-surfaces.md` |

## Revision note

First audit pass used a stricter **product-runtime** bar and parked contract-complete ADRs in `future/`.
User confirmed MerchantOS ADR DoD = **contracts + domain + tests**. **69 ADRs** were moved `future/ → done/` accordingly; remaining product gaps stay in `tasks/`.

## Move log (post-audit)

| Date | Move | File |
| --- | --- | --- |
| 2026-08-05 | `tasks/` → `done/` | `ADR-120-adr-status-truth-realignment.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-092-drizzle-kit-migrations.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-093-drizzle-repositories.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-095-nextauth-app-router-wiring.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-094-http-api-v1-surface.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-113-rbac-route-enforcement.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-119-security-hardening-runtime.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-096-merchant-pos-ui-complete-sale.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-097-catalog-inventory-merchant-apis-ui.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-098-crm-membership-merchant-ui.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-099-loyalty-engine-runtime.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-100-storefront-pickup-checkout.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-101-pickup-order-lifecycle-board.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-102-payments-http-psp.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-103-customer-otp-portal.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-104-store-location-maps-qr.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-105-staff-customer-pwa-completion.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-106-merchant-admin-dashboards-live.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-107-notifications-center.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-108-redis-cache-rate-limit-runtime.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-109-outbox-worker-emqx-mqtt.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-110-mongodb-analytics-runtime.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-111-minio-receipts-assets.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-112-readiness-probe-api-ready.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-114-shadcn-ui-component-library.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-121-merchant-onboarding-store-setup.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-122-marketing-landing-page.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-123-application-composition-root.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-124-realtime-mqtt-client-runtime.md` |
| 2026-08-05 | `tasks/` → `done/` | `ADR-071-scalability-stateless.md` |
| 2026-08-10 | `tasks/` → `done/` | `ADR-125-production-ui-shell-page-migration.md` |
| 2026-08-10 | `tasks/` → `done/` | `ADR-135-erpnext-role.md` |
| 2026-08-10 | `tasks/` → `done/` | `ADR-136-erpnext-boundary.md` |
| 2026-08-10 | `tasks/` → `done/` | `ADR-137-erpnext-data-mapping.md` |
| 2026-08-10 | `tasks/` → `done/` | `ADR-138-erpnext-sync-architecture.md` |
| 2026-08-10 | `tasks/` → `done/` | `ADR-139-erpnext-ui-strategy.md` |
| 2026-08-10 | `tasks/` → `done/` | `ADR-142-ordering-inventory-wiring.md` || ADR-151-production-fail-closed-worker-parity.md | tasks/ | done/ |
