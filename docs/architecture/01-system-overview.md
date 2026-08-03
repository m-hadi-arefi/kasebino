# 01 — System Overview

## Purpose

Describe the complete MerchantOS runtime so a senior engineer can implement modules without inventing topology.

## Product framing

MerchantOS is an **Iranian-native** multi-tenant SaaS for local retail retention. Every POS sale captures customer phone identity, updates CRM/loyalty/inventory, and feeds analytics + realtime dashboards. A public storefront allows catalog browse and **pickup-only** online orders per store.

**UX defaults:** Persian (`fa-IR`), RTL, Jalali dates, تومان formatting, Iranian SMS OTP — see `docs/rules/iranian-first-development.md`.

## Phase 1 topology (modular monolith)

```
                    ┌─────────────────────────────┐
   Merchants/Admin  │     Next.js App (stateless) │
   Customers (PWA)  │  UI + Route Handlers + SA   │
                    └───────┬───────────┬─────────┘
                            │           │
              ┌─────────────▼──┐   ┌────▼────────────┐
              │   PostgreSQL   │   │ Redis (cache +   │
              │   + Drizzle    │   │ rate limit)      │
              │   (OLTP SoT)   │   └─────────────────┘
              └───────┬────────┘
                      │
         ┌────────────┼────────────┬──────────┐
         ▼            ▼            ▼          ▼
     ┌───────┐   ┌──────┐   ┌───────┐  ┌─────────┐
     │ EMQX  │   │MinIO │   │ SMS   │  │ MongoDB │
     │ MQTT  │   │ S3   │   │Provider│  │analytics│
     └───────┘   └──────┘   └───────┘  └─────────┘
```

Single deployable: **Next.js** hosts presentation + application + thin infra adapters. Domain logic lives in pure TypeScript modules inside the monorepo (`src/modules/*`).

**MongoDB** holds analytics/audit/telemetry only — see `mongodb-architecture.md`.

## Logical layers

```
Presentation  → App Router pages, Server Components, Client Components, Route Handlers, Server Actions
Application   → Use cases / application services (orchestration, transactions)
Domain        → Aggregates, entities, VOs, domain events, policies, domain services
Infrastructure→ Drizzle ORM (PostgreSQL), Redis, EMQX, MinIO, SMS, NextAuth adapters
```

**Database layer:** PostgreSQL + Drizzle ORM. **Repository layer:** Drizzle implementations. **Domain:** pure DDD (no Drizzle). See `database-architecture.md`.

Dependencies point inward only (Clean Architecture / DIP).

## Runtime characteristics

| Property | Choice |
| --- | --- |
| Process model | Stateless Node instances |
| Session | JWT (no server session store) |
| Consistency | Strong in DB transaction per command; eventual via events for projections/cache |
| Scale | Horizontal behind load balancer |
| Local parity | Docker Compose: app, Postgres, Redis, EMQX, MinIO |

## Primary flows

1. **Auth:** phone → OTP → JWT → optional MerchantCreated
2. **POS sale:** scan → cart → phone → pay → SaleCompleted → inventory/loyalty/CRM/analytics side effects
3. **Storefront order:** anonymous browse → OrderCreated → merchant realtime notify
4. **Dashboard:** cache-aside reads of aggregations; invalidate on sale/order events

## Module map (packages inside monolith)

| Module | Responsibility |
| --- | --- |
| identity | OTP, JWT, sessions, platform roles |
| merchant | Merchant aggregate, activation, settings |
| store | Store profile, hours, contact |
| catalog | Products, categories, barcodes |
| inventory | Stock levels, low/out events |
| pos | Checkout use cases, receipts |
| crm | Customers, segments, history |
| loyalty | Points, wallet, coupons, rewards |
| ordering | Online orders lifecycle |
| payments | Payment ports (abstract PSP) |
| analytics | Merchant OLTP aggregations (PG North Star) + analytics ingest ports |
| audit | AuditPort → Mongo audit store |
| notifications | In-app + SMS campaign hooks |
| realtime | EMQX publish/subscribe adapters |
| admin | Platform admin operations |
| platform | Shared kernel: tenant, auditing, IDs |

## Non-negotiables

- Tenant isolation on every query
- Mutations publish domain events when catalog requires
- Cache invalidation via events
- Soft delete + audit (Mongo audit plane) + UUID + timestamps on persisted OLTP entities
- uiuxpromax for all UI generation
- Analytics/telemetry must not block OLTP after commit

## Related

- Domain model: `domain-model.md`
- Events: `event-catalog.md`
- Extraction: `20-future-microservice-extraction.md`
