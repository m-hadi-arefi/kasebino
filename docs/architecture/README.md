# Architecture Documentation

MerchantOS Phase 1: **modular monolith**, event-driven, DDD, extraction-ready — an **Iranian-native** retail OS (Persian, RTL, Jalali, تومان).

**Persistence:** PostgreSQL + **Drizzle ORM** (only) + Redis cache-aside. Database design is Tier-0 — see database docs below before any schema work. Plan UTF-8 Persian text storage and Persian-aware search/indexing.

**UX law:** [`docs/rules/iranian-first-development.md`](../rules/iranian-first-development.md) · Checklist: [`docs/checklists/iranian-feature-checklist.md`](../checklists/iranian-feature-checklist.md)

**Decisions:** Canonical ADRs in [`/adrs`](../../adrs/). Build order: [adr-roadmap.md](./adr-roadmap.md). Dependencies: [adr-dependency-map.md](./adr-dependency-map.md).

## Core documents

| # | Document | Purpose |
| --- | --- | --- |
| 01 | [01-system-overview.md](./01-system-overview.md) | End-to-end system view |
| 02 | [02-domain-map.md](./02-domain-map.md) | Domains & ownership |
| 03 | [03-bounded-contexts.md](./03-bounded-contexts.md) | Context boundaries |
| 04 | [04-event-driven-architecture.md](./04-event-driven-architecture.md) | Events & messaging |
| 05 | [05-multi-tenant-strategy.md](./05-multi-tenant-strategy.md) | Tenant isolation |
| 06 | [06-security-architecture.md](./06-security-architecture.md) | Security controls |
| 07 | [07-cache-architecture.md](./07-cache-architecture.md) | Redis caching |
| 08 | [08-real-time-architecture.md](./08-real-time-architecture.md) | EMQX realtime |
| 09 | [09-authentication-architecture.md](./09-authentication-architecture.md) | OTP + JWT |
| 10 | [10-observability-architecture.md](./10-observability-architecture.md) | Logs/metrics/traces |
| 11 | [11-deployment-architecture.md](./11-deployment-architecture.md) | Deploy topology |
| 12 | [12-infrastructure-architecture.md](./12-infrastructure-architecture.md) | Infra services |
| 13 | [13-pwa-architecture.md](./13-pwa-architecture.md) | PWA offline |
| 14 | [14-ddd-architecture.md](./14-ddd-architecture.md) | DDD layering |
| 15 | [15-api-architecture.md](./15-api-architecture.md) | HTTP/API design |
| 16 | [16-storage-architecture.md](./16-storage-architecture.md) | PostgreSQL + Drizzle + MinIO |
| 17 | [17-message-broker-architecture.md](./17-message-broker-architecture.md) | EMQX topics |
| 18 | [18-failure-recovery-architecture.md](./18-failure-recovery-architecture.md) | Resilience |
| 19 | [19-performance-architecture.md](./19-performance-architecture.md) | Perf budgets |
| 20 | [20-future-microservice-extraction.md](./20-future-microservice-extraction.md) | Extraction plan |

## Database architecture (Tier-0 OLTP)

| Document | Purpose |
| --- | --- |
| [database-architecture.md](./database-architecture.md) | Capacity, tenancy, PG strategy |
| [indexing-strategy.md](./indexing-strategy.md) | Explicit indexes per table |
| [query-strategy.md](./query-strategy.md) | Query-first design |
| [data-modeling-guidelines.md](./data-modeling-guidelines.md) | Table/constraint standards |

## Analytics / MongoDB / audit suite

| Document | Purpose |
| --- | --- |
| [mongodb-architecture.md](./mongodb-architecture.md) | Analytics data plane |
| [analytics-architecture.md](./analytics-architecture.md) | Dual-layer analytics map |
| [product-analytics-architecture.md](./product-analytics-architecture.md) | Feature/funnel product analytics |
| [event-warehouse-architecture.md](./event-warehouse-architecture.md) | Domain event warehouse |
| [audit-architecture.md](./audit-architecture.md) | Audit logging |
| [user-behavior-tracking-architecture.md](./user-behavior-tracking-architecture.md) | Clickstream/sessions |
| [management-dashboards-architecture.md](./management-dashboards-architecture.md) | Platform mgmt reporting |
| [security-monitoring-architecture.md](./security-monitoring-architecture.md) | Abuse/security signals |
| [data-retention-architecture.md](./data-retention-architecture.md) | Retention TTLs |

## Store-first / customer ownership suite

| Document | Purpose |
| --- | --- |
| [storefront-pwa-architecture.md](./storefront-pwa-architecture.md) | Per-store URL/QR/branding/PWA |
| [customer-membership-architecture.md](./customer-membership-architecture.md) | StoreMembership domain |
| [pickup-order-architecture.md](./pickup-order-architecture.md) | Pickup-only lifecycle |
| [qr-acquisition-architecture.md](./qr-acquisition-architecture.md) | QR growth acquisition |
| [store-location-architecture.md](./store-location-architecture.md) | Mandatory geo + maps |
| [event-catalog-store-first-addendum.md](./event-catalog-store-first-addendum.md) | New events for membership/pickup |

## DDD & data plane

- [domain-model.md](./domain-model.md)
- [event-catalog.md](./event-catalog.md)
- [cache-strategy.md](./cache-strategy.md)

## Rules

Implementations MUST follow `docs/rules/architecture-rules.md`, `drizzle-rules.md`, `database-rules.md`, `mongodb-rules.md`, `analytics-rules.md`, `audit-rules.md`.
