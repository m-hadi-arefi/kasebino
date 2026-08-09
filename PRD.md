# Product Requirements Document — MerchantOS

| Field | Value |
| --- | --- |
| Product | MerchantOS |
| Tagline | Customer Retention Operating System for Local Retail |
| Version | 1.2 |
| Status | Engineering Ready (MVP policies locked via ADR-091) |
| Target market | Iranian local retail (Phase 1: Kerman, Iran) — Iranian-native product |
| Document owner | Product Team |
| Last updated | 2026-08-03 |

**Product identity:** MerchantOS is an **Iranian-native retail operating system** for Iranian merchants and customers. Persian language, RTL UI, Jalali dates, تومان formatting, Iranian phone/SMS patterns, and Iranian retail workflows are mandatory product requirements — not optional localization. See `docs/rules/iranian-first-development.md`.

**Evolution note:** Store-first storefront/PWA/membership/pickup requirements are mandatory. See `docs/product/store-first-evolution.md` (supersedes older thin-storefront wording where conflicting).

---

## 1. Problem Statement

Local retailers run on anonymous cash-register style sales. They rarely know who bought what, when, or whether that customer will return. As a result:

- Repeat purchase rates stay low.
- Loyalty is informal (discounts given by memory, not system).
- Marketing is expensive and untargeted.
- Growth depends on foot traffic instead of owned customer relationships.

Existing tools do not solve this well:

| Category | Why it fails for this merchant |
| --- | --- |
| Accounting software | Tracks money, not customers |
| ERP | Too heavy, slow at the counter |
| Marketplaces | Own the customer; merchant does not |
| Generic CRM | Not wired into the checkout moment |

**Core insight:** Retention starts at the point of sale. If customer identity is not captured during checkout, every later retention tactic fails.

---

## 2. Product Vision & Mission

### Vision

Enable every local merchant to know their customers, increase repeat purchases, and grow revenue through data-driven engagement.

### Mission

Transform local Iranian retail from **anonymous transactions** into **customer relationships**.

- Every sale creates customer intelligence.
- Every customer interaction creates a future revenue opportunity.
- Every merchant/customer-facing experience ships as Persian + RTL by default.

### Core product principle

| MerchantOS is NOT | MerchantOS IS |
| --- | --- |
| Accounting software | A customer retention engine |
| ERP | Powered by POS transactions |
| Marketplace | Owned by the merchant |

### ERPNext Integration Vision

MerchantOS does not become ERP software. Future architecture pairs the platforms:

**MerchantOS provides**

- Retail experience (Persian + RTL cashier and customer UX)
- POS (including offline)
- Customer engagement (CRM, loyalty, store PWA)
- Store operations (catalog presentation, pickup orders, operational stock)

**ERPNext provides**

- Enterprise resource planning capabilities behind an integration boundary
- Accounting (GL, invoices as books, A/R–A/P)
- Financial control (tax accounting configuration, ledgers, statutory-style reports)
- Purchase / supplier books (ERP-first until a dedicated MOS purchase ADR)

Integration is asynchronous (outbox → `AccountingProvider` / `ErpNextAccountingProvider`). Core domains never import ERPNext. See `docs/integrations/erpnext/` and **ADR-135…140** (role, boundary, mapping, sync, UI, runtime adapter). Prep seams: ADR-126…134.

---

## 3. Goals & Non-Goals

### Goals (Phase 1 / MVP)

1. Make checkout fast enough that merchants actually use it during peak hours.
2. Capture customer identity (phone) as part of every sale and create store membership.
3. Build a usable CRM from POS activity without manual data entry.
4. Run a simple loyalty program (points, rewards, coupons, wallet) visible to customers in store PWA.
5. Give merchants retention-focused analytics (who returns, who lapsed).
6. Offer a **dedicated per-store storefront** with URL, QR, branding, installable PWA, and **pickup-only** online ordering.
7. Ship as cloud-native SaaS with production-grade ops from day one.
8. Enable customers to OTP-login, view profile/points/history/rewards/receipts, and navigate to the physical store.

### Non-goals (explicitly out of scope for MVP)

- Full double-entry accounting / tax filing **inside MerchantOS** (external ERPNext owns books later — see ERPNext Integration Vision)
- Multi-warehouse logistics / ERP purchasing **as a MOS SoT** (ERPNext-first)
- Public marketplace / multi-merchant browsing
- Supplier management networks
- Advanced AI recommendations (later phase)
- Desktop-native offline-first POS hardware suite (PWA offline is enough for MVP)
- **Delivery, courier integration, rider fleets, shipping**
- Replacing MerchantOS POS/storefront with ERPNext Desk or Website

---

## 4. North Star & Success Metrics

### North Star Metric

**Monthly Returning Customers**

> Customers who make more than one purchase within a rolling 30-day window.

### Success metrics & targets

#### Merchant metrics

| Metric | Target |
| --- | --- |
| Merchant activation rate | 70% |
| 30-day merchant retention | 70% |
| 90-day merchant retention | 50% |

#### Customer metrics

| Metric | Target |
| --- | --- |
| Customer capture rate (sales with phone) | 80% |
| Repeat purchase rate | 25% |
| Average customer LTV | Track per merchant (no fixed MVP target) |

#### Platform metrics (track continuously)

- Daily Active Merchants (DAM)
- Monthly Active Merchants (MAM)
- GMV
- Revenue
- ARPU
- LTV
- CAC

---

## 5. Users & Personas

### 5.1 Merchant (primary)

Retail shop owner — mobile shops, fashion, cosmetics, shoes, accessories.

**Jobs to be done**

- Sell faster at the counter
- Keep customers coming back
- Increase repeat purchases without hiring a marketer

### 5.2 Store employee

**Jobs to be done**

- Fast checkout
- Easy product lookup
- Capture customer phone without friction

### 5.3 End customer

**Jobs to be done**

- Quick purchase
- Earn / redeem loyalty rewards
- Easy reordering via storefront

### 5.4 Platform admin

**Jobs to be done**

- Merchant management
- Platform growth tooling
- Fraud prevention & monitoring

---

## 6. Monetization

| Stream | Description | Phase |
| --- | --- | --- |
| Transaction fees | Fee on digital payments / online orders | Post-pilot (inactive in free Kerman pilot — ADR-091) |
| Marketing credits | Prepaid credits for SMS / campaigns | Post-pilot |
| Premium features | Advanced analytics, automation, paid plans | Post-pilot |
| Advertising network | Sponsored placement across merchant base | Future |

---

## 7. MVP Scope

### In scope

| Domain | Capabilities |
| --- | --- |
| Authentication | Merchant SMS OTP; **Customer SMS OTP** (separate audience) |
| Store | Profile, **mandatory geo location**, branding, storefront URL, QR |
| POS | Product search, barcode/camera/fuzzy search, quick checkout, customer capture → membership, receipt |
| CRM / Membership | Store-owned customer base; membership first-class; profiles, history, segments |
| Loyalty | Points, rewards, coupons, wallet **per store membership**; customer-visible |
| Storefront + Store PWA | Dedicated URL, branding, QR, installable PWA, catalog, pickup checkout, map/nav |
| Orders | **Pickup-only** online orders with full pickup lifecycle |
| Customer portal | Profile, points, history, rewards, receipts |
| Analytics | Merchant, revenue, customer, retention dashboards |

### Out of scope (see Non-goals)

Everything listed in §3 Non-goals, including delivery/courier/shipping.

---

## 8. Functional Requirements

Requirements use IDs for traceability. Priority: `P0` = MVP blocker, `P1` = MVP stretch / early Phase 2.

### 8.1 Authentication — `AUTH`

| ID | Requirement | Priority |
| --- | --- | --- |
| AUTH-01 | Login and registration use **phone number only** (no email, no password) | P0 |
| AUTH-02 | OTP verification is mandatory for session establishment | P0 |
| AUTH-03 | Dev mode returns OTP in API response and does **not** send SMS | P0 |
| AUTH-04 | Production mode never returns OTP; SMS provider delivers it | P0 |
| AUTH-05 | Sessions use **stateless JWT** (no server-side session store) | P0 |
| AUTH-06 | Successful auth can create a merchant account on first registration | P0 |

**Acceptance criteria — AUTH**

- [ ] Phone OTP login works end-to-end in production mode via SMS provider
- [ ] Dev mode response includes OTP payload; production response never includes OTP
- [ ] OTP routes enforce rate limits (see §11.3)
- [ ] JWT is issued only after successful OTP verification

### 8.2 POS — `POS`

| ID | Requirement | Priority |
| --- | --- | --- |
| POS-01 | Merchant can complete a standard barcode checkout in **&lt; 5 seconds** | P0 |
| POS-02 | Barcode scan resolves product in **≤ 1 second** | P0 |
| POS-03 | Product search (including fuzzy) responds in **≤ 100ms** at p95 for cached/local catalogs | P0 |
| POS-04 | Camera barcode scan is supported on mobile browsers | P0 |
| POS-05 | Checkout requires customer phone capture | P0 |
| POS-06 | Capture flow creates/updates CRM customer from phone | P0 |
| POS-07 | Completed sale generates a receipt | P0 |
| POS-08 | Offline sale queue + background sync when connectivity returns (PWA) | P1 |

**User story**

> As a merchant, I want to scan a barcode and complete a sale instantly, so I can serve customers quickly during peak hours.

**Acceptance criteria — POS**

- [ ] Measured checkout time under 5s for barcode → add → phone → pay → complete
- [ ] Unmatched barcode shows a clear recovery path (create/search product)
- [ ] Sale publishes `SaleCreated` / `SaleCompleted` domain events
- [ ] Customer phone creates or links CRM record atomically with the sale

### 8.3 CRM — `CRM`

| ID | Requirement | Priority |
| --- | --- | --- |
| CRM-01 | Customer profile stores identity, contact, and engagement stats | P0 |
| CRM-02 | Purchase history is queryable per customer | P0 |
| CRM-03 | Basic segmentation (e.g. new, returning, lapsed) is available | P0 |
| CRM-04 | Customer statistics surface on merchant dashboard | P0 |

**Acceptance criteria — CRM**

- [ ] Merchant can open a customer profile and see purchase history
- [ ] Segments update from sale events without manual rebuild jobs in UI
- [ ] Soft-deleted customers are excluded from default lists

### 8.4 Loyalty — `LYL`

| ID | Requirement | Priority |
| --- | --- | --- |
| LYL-01 | Point rules are merchant-configurable (e.g. 100,000 IRR = 1 point) | P0 |
| LYL-02 | System emits `PointsEarned`, `PointsRedeemed`, `PointsExpired` | P0 |
| LYL-03 | Rewards and coupons can be created and redeemed at POS | P0 |
| LYL-04 | Customer wallet balance is visible to merchant and customer | P0 |

**Acceptance criteria — LYL**

- [ ] Completing a sale awards points per configured rule
- [ ] Redeeming points decreases wallet and publishes redeem event
- [ ] Expired points are removed and publish `PointsExpired`

### 8.5 Storefront — `SF`

| ID | Requirement | Priority |
| --- | --- | --- |
| SF-01 | Public product catalog for a **dedicated store** storefront | P0 |
| SF-02 | Product detail pages | P0 |
| SF-03 | Online ordering for **in-store pickup only** | P0 |
| SF-04 | Store information page (name, contact, hours, **map/nav**) | P0 |
| SF-10 | Each store has dedicated storefront URL | P0 |
| SF-11 | Storefront branding configurable | P0 |
| SF-12 | Store QR code generated & printable | P0 |
| SF-13 | Store installable PWA | P0 |

**Acceptance criteria — SF**

- [ ] Visitor can open URL or QR, browse catalog, and place a **pickup** order
- [ ] No delivery option exposed in MVP UI
- [ ] New online order appears in merchant real-time updates
- [ ] Storefront pages meet performance budgets in §10
- [ ] Store PWA is installable with store branding

### 8.5b Customer identity & portal — `CUST`

| ID | Requirement | Priority |
| --- | --- | --- |
| CUST-01 | Customer login/registration via phone OTP | P0 |
| CUST-02 | Customer profile in store membership context | P0 |
| CUST-03 | Customer can view points, purchase history, rewards, receipts | P0 |

### 8.5c Membership — `MEM`

| ID | Requirement | Priority |
| --- | --- | --- |
| MEM-01 | Store–customer membership is first-class; store owns customer base | P0 |
| MEM-02 | POS phone capture and customer OTP join both create/link membership | P0 |

### 8.5d Location — `LOC`

| ID | Requirement | Priority |
| --- | --- | --- |
| LOC-01 | Store address + latitude + longitude mandatory | P0 |
| LOC-02 | Map display + navigation affordance on storefront | P0 |

### 8.5e Orders pickup — `ORD` (extends online orders)

| ID | Requirement | Priority |
| --- | --- | --- |
| ORD-10 | MVP fulfillment mode is in-store pickup only | P0 |
| ORD-11 | Lifecycle: Pending Payment, Paid, Preparing, Ready For Pickup, Picked Up, Completed, Cancelled, Refunded | P0 |
| ORD-12 | Checkout UX redesigned around pickup (not delivery) | P0 |

### 8.6 Analytics — `AN`

| ID | Requirement | Priority |
| --- | --- | --- |
| AN-01 | Merchant overview dashboard | P0 |
| AN-02 | Revenue dashboard | P0 |
| AN-03 | Customer dashboard | P0 |
| AN-04 | Retention dashboard (supports North Star: returning customers) | P0 |

**Acceptance criteria — AN**

- [ ] Dashboards reflect completed sales within cache TTL windows
- [ ] Retention dashboard can compute Monthly Returning Customers
- [ ] Aggregations are cache-backed (see §11.2)

### 8.7 Platform admin — `ADM`

| ID | Requirement | Priority |
| --- | --- | --- |
| ADM-01 | Merchant management (list, view, activate/suspend) | P1 |
| ADM-02 | Fraud / abuse monitoring hooks | P1 |
| ADM-03 | Real-time admin monitoring via EMQX | P1 |

---

## 9. Feature Spec Highlights

### 9.1 Customer capture (POS)

1. Phone number is required at checkout.
2. Flow is optimized for speed (minimal taps / keypad UX).
3. Phone becomes the CRM primary key for that merchant’s customer record.

### 9.2 Loyalty engine defaults

Configurable example earn rule:

```
100,000 IRR spent = 1 Point
```

**Expiry default (ADR-091):** points expire **12 months after last earn** on that store membership (merchant-configurable).

Domain events: `PointsEarned`, `PointsRedeemed`, `PointsExpired`.

---

## 10. Non-Functional Requirements

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | POS checkout &lt; 5s; barcode ≤ 1s; search ≤ 100ms (p95 target conditions) |
| NFR-02 | Scalability | Stateless app instances; horizontal scale behind load balancer |
| NFR-03 | Availability | Zero-downtime deploy strategy |
| NFR-04 | Security | HTTPS only, secure cookies, JWT rotation, Zod input validation, CSRF/XSS/SQLi protections |
| NFR-05 | Observability | Structured logs, health checks, metrics, tracing-ready (OpenTelemetry), error monitoring |
| NFR-06 | Mobile | Mobile-first UI for Iranian Android-class devices; installable PWA |
| NFR-07 | Offline | Offline product search + sale queue + background sync (P1 acceptable if core POS online path is P0) |
| NFR-08 | Landing page quality | Lighthouse ≥ 95 for Performance, SEO, Accessibility, Best Practices (Persian SEO metadata) |
| NFR-09 | App quality gate | Feature DoD requires Lighthouse &gt; 90 on primary merchant screens |
| NFR-10 | Compliance engineering | Soft deletes, audit logs, UUID PKs, `createdAt` / `updatedAt` on persisted entities |
| NFR-11 | Iranian First UX | Persian copy, RTL layout, Jalali dates, تومان formatting, Iranian phone/SMS; see `docs/rules/iranian-first-development.md` |

---

## 11. System Architecture Requirements

### 11.1 Style & principles

**Phase 1:** Modular monolith  
**Phase 2:** Microservice-ready extraction

Must follow:

- Domain-Driven Design (DDD)
- Event-driven communication
- Clean Architecture + SOLID + dependency inversion
- Stateless services
- Horizontal scalability
- Containerized deployment
- CQRS-ready / event-sourcing compatible (design, not mandatory full ES in MVP)

### 11.2 Layering (backend)

```
Presentation  → Route Handlers / Server Actions
Application   → Use cases / orchestration
Domain        → Entities, value objects, domain events, policies
Infrastructure→ Drizzle, Redis, EMQX, MinIO, SMS, etc.
```

### 11.3 Caching (Redis — mandatory)

**Pattern:** Cache-aside (cache-first reads)

```
GET → Redis hit? → return
     → miss → PostgreSQL → write Redis → return
```

**Invalidation:** Mutations publish domain events → cache service deletes keys → next read rebuilds.

| Resource examples | Default TTL |
| --- | --- |
| Most entities (merchant, product, customer, settings) | 300s |
| Analytics aggregations | 60s |
| Storefront | 600s |

Cached resources include: merchant/store profiles, storefront, product lists/details, categories, dashboard aggregations, customer/loyalty stats, analytics summaries, settings, permissions.

### 11.4 Rate limiting (Redis — mandatory)

| Scope | Limit |
| --- | --- |
| Default per route / IP / user | 10 req/s |
| Authentication routes | 5 req/min |
| OTP routes | 3 req/min |
| Admin routes | 20 req/s |

### 11.5 Real-time (EMQX — mandatory)

All listed domain events must be publishable. Real-time subscribers for:

- Inventory changes
- POS sales
- New orders & order status
- Customer create/update
- Campaign progress
- Dashboard / notification updates
- Merchant & admin monitoring

### 11.6 Domain event catalog (MVP baseline)

```
MerchantCreated, MerchantActivated, MerchantUpdated
StoreCreated, StoreUpdated
ProductCreated, ProductUpdated, ProductDeleted
InventoryChanged, InventoryLow, InventoryOutOfStock
CustomerCreated, CustomerUpdated, CustomerDeleted
SaleCreated, SaleCompleted, SaleCanceled
OrderCreated, OrderPaid, OrderPreparing, OrderReadyForPickup, OrderPickedUp, OrderCompleted, OrderCanceled, OrderRefunded
PointsEarned, PointsRedeemed, PointsExpired
CampaignCreated, CampaignSent, CampaignCompleted
MerchantLoggedIn, MerchantLoggedOut
StorefrontVisited, CustomerReturned
```

> MVP note: `OrderDelivered` is **out of scope** (pickup-only). See ADR-082 / ADR-091.

### 11.7 Database (PostgreSQL + Drizzle ORM)

- **Drizzle ORM** is the only approved ORM (latest stable)
- UUID primary keys
- Soft deletes
- `createdAt` / `updatedAt`
- Audit logs
- Explicit indexes for POS search, customer phone lookup, and sale history (query-first design)
- Repository pattern; domain layer never depends on Drizzle
- Migrations via Drizzle Kit (versioned, production-safe)

### 11.8 Infrastructure

- Docker Compose required for local parity with:
- PostgreSQL
- Redis
- EMQX
- MinIO
- MongoDB (analytics/audit/telemetry plane)
- MerchantOS app

Environments: development, staging, production — all containerized.

Additive analytics/audit capabilities and PA-* requirements: see `docs/product/analytics-requirements.md` and ARD-021–028. OLTP remains PostgreSQL + Drizzle ORM.

---

## 12. Technology Stack

### Frontend

- Next.js 15+
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- React Hook Form + Zod
- PWA support

### Backend

- Next.js backend (Route Handlers + Server Actions)
- TypeScript
- Drizzle ORM
- DDD layering as in §11.2

### Data & messaging

| Concern | Choice |
| --- | --- |
| Primary DB | PostgreSQL (latest stable) |
| Cache | Redis (latest stable) |
| Object storage | MinIO (latest stable) |
| Event broker / realtime | EMQX MQTT (latest stable) |
| Auth | NextAuth, JWT strategy, OTP SMS login |

---

## 13. Landing Page Requirements

Marketing site built with Next.js + Tailwind + shadcn/ui.

**Sections:** Hero, Features, Benefits, How it works, Screenshots, Pricing, FAQ, CTA, Footer.

**Quality bar:** Lighthouse ≥ 95 (Performance, SEO, Accessibility, Best Practices).

---

## 14. Security Requirements

- HTTPS only
- Secure cookies
- JWT rotation
- Rate limiting (§11.4)
- Input validation with Zod
- SQL injection protection (parameterized ORM queries)
- XSS protection
- CSRF protection
- Audit logging for sensitive actions

---

## 15. Observability Requirements

- Structured logging
- OpenTelemetry-ready instrumentation
- Health checks
- Metrics
- Distributed tracing hooks
- Error monitoring
- Performance monitoring

---

## 16. Deployment Requirements

- Zero-downtime deployments
- Multiple stateless app instances
- Load-balancer compatible
- Horizontally scalable
- Production-ready configuration (secrets, health, readiness)

---

## 17. Definition of Done

A feature is **done** only when all apply:

- [ ] Domain logic implemented in correct layer
- [ ] Tests implemented
- [ ] API documented
- [ ] Domain events published where applicable
- [ ] Cache invalidation handled
- [ ] Authorization enforced
- [ ] Audit logs generated for sensitive mutations
- [ ] Real-time updates implemented where applicable
- [ ] Mobile responsive (Iranian Android-class devices)
- [ ] Persian + RTL on merchant/customer surfaces; Jalali + تومان where dates/money shown
- [ ] Iranian feature checklist passed (`docs/checklists/iranian-feature-checklist.md`) when UX in scope
- [ ] Lighthouse &gt; 90 on primary screens
- [ ] TypeScript strict mode passes
- [ ] No ESLint warnings
- [ ] No build warnings

---

## 18. Delivery Milestones

| Milestone | Outcome | Exit criteria |
| --- | --- | --- |
| M0 — Foundations | Repo, Docker Compose, CI, auth skeleton, DDD folders | Local stack boots; OTP login works in dev mode |
| M1 — Catalog & POS online | Products + barcode checkout + customer capture + receipt | POS ACs in §8.2 met for online path |
| M2 — CRM & Loyalty | Profiles, history, segments, points/wallet/coupons | CRM + LYL ACs met; events published |
| M3 — Analytics | Merchant / revenue / customer / retention dashboards | North Star visible; cache TTLs applied |
| M4 — Storefront | Public catalog + product pages + online orders | SF ACs met; realtime order notify |
| M5 — PWA & hardening | Installable PWA, offline queue (P1), rate limits, observability | NFR checklist signed off |
| M6 — Launch readiness | Landing page, staging deploy, load/security smoke | DoD + lighthouse landing ≥ 95 |

Suggested sequencing: **M0 → M1 → M2 → M3 / M4 in parallel → M5 → M6**.

---

## 19. Open Questions → Resolved (ADR-091)

Canonical detail: [`adrs/ADR-091-mvp-product-policy-resolutions.md`](./adrs/ADR-091-mvp-product-policy-resolutions.md).

| # | Topic | Resolution |
| --- | --- | --- |
| 1 | SMS provider (Iran) | Still **Proposed** (ADR-083). Dev/console adapter until accepted. |
| 2 | Payment PSP | Still **Proposed** (ADR-084). Sandbox/mock until accepted. Online pickup only. |
| 3 | Multi-store in MVP | **Full multi-store in MVP** — per-store inventory, branding, QR, PWA, membership/wallet. |
| 4 | Loyalty expiry defaults | **12 months from last earn** per store membership; merchant-configurable. |
| 5 | Offline conflict (queued sales) | Per ADR-024: online P0; offline P1; conflict = **reject-and-review**. |
| 6 | Phone storage / consent | **POS:** Persian notice + continue = consent. **Customer PWA OTP:** explicit checkbox. Soft-delete + audit. |

### Additional MVP policies (same ADR)

| Topic | Resolution |
| --- | --- |
| POS tender | Record `cash` \| `card_terminal` \| `mixed`; card acquiring out of system |
| Pickup timers | Unpaid **30m** → cancel; `ready_for_pickup` **24h** then staff cancel + manual refund |
| Storefront URL | Path-based `/s/{storeSlug}` |
| Maps | Static map image + external Navigate deep link |
| Phase-1 pricing | **Free Kerman pilot**; fee% unlock post-pilot |

Still open for humans before **production go-live** (not before coding): Accept ADR-083 (SMS), ADR-084 (PSP), counsel review of consent copy.

---

## 20. Next Engineering Artifact

This PRD is product + engineering-requirements level. Before large-scale implementation, produce a **Software Architecture Document (SAD)** covering:

- DDD bounded contexts
- Full ERD
- Event catalog (payload schemas + topics)
- API contracts
- Redis key design
- EMQX topic design
- Docker topology
- Repository folder structure

---

## 21. Final Product Goal

MerchantOS should become the operating system for local retail businesses by turning every sale into customer intelligence and every customer interaction into future revenue.
