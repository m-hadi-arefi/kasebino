# Analytics Architecture

## Scope

MerchantOS analytics has **two complementary layers**:

| Layer | Store | ARD focus | Purpose |
| --- | --- | --- | --- |
| **Operational merchant analytics** | PostgreSQL projections + Redis | ARD-013, ARD-016 | Revenue, customers, North Star retention for the merchant app |
| **Product / platform analytics** | MongoDB | ARD-021, ARD-023–027 | Product usage, funnels, clickstream, sessions, feature usage, management reporting, security monitors |

This document governs the full analytics system and how both layers cooperate.

**Code contract:** `src/analytics-boundaries/` (ADR-014) — dual-plane rules, money-truth / dual-read, off-checkout-critical-path, Persian + Jalali merchant report UX notes. Mongo plane implementation → ADR-056. Merchant OLTP AN-* projections + counter ports → `src/merchant-oltp-analytics/` + `src/modules/analytics/` (ADR-063); HTTP/UI → ARD-016 / ADR-088.

## Capability map

| Capability | Primary store | Producers | Consumers |
| --- | --- | --- | --- |
| Product analytics | MongoDB | UI trackers, domain outbox bridge | Product/PM dashboards, feature flags decisions |
| Event warehouse | MongoDB | Outbox consumer mirroring domain events | Analytics jobs, investigations |
| Audit logging | MongoDB (+ optional PG thin audit for critical path) | Use cases on sensitive mutations | Compliance, admin, security |
| User behavior tracking | MongoDB | Client SDK / beacon API | Funnels, UX improvement |
| Clickstream | MongoDB | Storefront + merchant app | Path analysis |
| Session analytics | MongoDB | Session start/heartbeat/end | Engagement metrics |
| Feature usage | MongoDB | Explicit track calls + route middleware | Adoption metrics |
| Conversion funnels | MongoDB aggregations | Derived from behavior + domain events | Growth / activation |
| Management dashboards | MongoDB rollups (+ PG for financial SoT) | Batch/stream aggregators | Platform admin / leadership |
| Admin / security monitoring | MongoDB + EMQX alerts | Auth, abuse hooks, admin actions | ARD-018/026 |

## Principles

1. **OLTP first** — never write analytics needs into sale critical path beyond emitting ports/outbox.
2. **Schema-versioned events** — evolve with `schemaVersion`.
3. **PII minimization** — hash/mask phones in product analytics where full identity not required; audit may retain keyed identity under policy.
4. **Idempotent ingest** — unique `eventId`.
5. **Tenant isolation** — merchant dashboards never leak cross-tenant.
6. **Dual-read discipline** — money figures shown as accounting truth come from PostgreSQL/ pro jections; engagement metrics from MongoDB.

## Required analytics events (baseline catalog)

### Domain-bridged (from outbox → warehouse)

Mirror event-catalog.md types into warehouse collections, including: `SaleCompleted`, `OrderCreated`, `CustomerCreated`, `MerchantActivated`, `PointsEarned`, etc.

### Product / behavior

| Event | When |
| --- | --- |
| `AppOpened` | Merchant app / PWA open |
| `PageViewed` | Route change |
| `ElementClicked` | Tracked CTA |
| `FeatureUsed` | Named feature key |
| `PosSessionStarted` / `PosCheckoutCompleted` | POS UX timing |
| `BarcodeScanAttempted` / `BarcodeScanSucceeded` / `BarcodeScanFailed` | POS quality |
| `CustomerCaptureShown` / `CustomerCaptureCompleted` | Capture funnel |
| `StorefrontViewed` / `ProductDetailViewed` / `AddToCart` / `CheckoutStarted` / `OrderPlaced` | Storefront funnel |
| `LoyaltyRedeemClicked` | Loyalty UX |
| `DashboardWidgetViewed` | Analytics engagement |
| `SessionStarted` / `SessionHeartbeat` / `SessionEnded` | Sessions |

### Security / admin

| Event | When |
| --- | --- |
| `AuthOtpRequested` / `AuthOtpFailed` / `AuthOtpSucceeded` | Auth monitoring |
| `RateLimitTriggered` | Abuse |
| `AdminMerchantSuspended` | Admin |
| `SuspiciousAccessPattern` | Derived |

## Funnels (minimum)

1. **Merchant activation:** Register → Create store → Add product → First SaleCompleted  
2. **POS capture:** Open POS → Scan/Search → Capture phone → Complete sale  
3. **Storefront conversion:** Visit → PDP → Checkout start → OrderCreated  
4. **Loyalty:** Sale → PointsEarned → later PointsRedeemed  

## Metrics examples

- Activation rate, DAM/MAM proxies  
- Customer capture rate (sales with phone)  
- Checkout duration histograms  
- Funnel step conversion  
- Feature adoption (% merchants using loyalty config)  
- North Star still computed from OLTP (ARD-016); product analytics *explains* it  

## Aggregation strategy

| Latency | Technique |
| --- | --- |
| Realtime hints | EMQX + client invalidate |
| Near-real-time (<5m) | Incremental Mongo aggregations / materialized collections |
| Daily | Batch rollups into `mos_mgmt` |

## Related ARDs

021 Analytics Platform, 022 Audit, 023 Product Analytics, 024 Event Warehouse, 025 Management Dashboards, 026 Security Monitoring, 027 User Behavior Tracking, 028 Observability; OLTP merchant analytics remains 013/016.
