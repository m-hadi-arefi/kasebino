# Progress Log

Autonomous execution diary. Append-only.

## Format

```
### YYYY-MM-DD — ARD-XXX — <status>

- Plan: ...
- Changes: ...
- Validations: lint/typecheck/tests/architecture
- Docs updated: ...
- Next: ...
```

## Entries

### 2026-08-03 — ADR-069 CI/CD Strategy — completed

- Plan: `docs/execution/plans/ADR-069.md`
- Changes: `.github/workflows/ci.yml` (PR + main: `npm ci`, `npm run validate`, `npm run build`, migration-review reminder, no secrets echoed); `src/cicd-strategy` contract (lint/type/test/build + migration review, CD staging→prod with approvals, no skip hooks, no secrets in logs); testing-strategy CI workflow pointer; deployment architecture release-gate sync; ARD-019 CI quality-gate note
- Validations: `npm run validate` green (694 tests)
- Iranian First: UX N/A (infra/CI-only); mobile asset path protected via lean build gate / ADR-067 standalone
- Docs updated: STATUS → completed; ADR-069 criteria checked; plan completion notes; ARD-019 STATUS note
- Next: ADR-070 Deployment and Zero-Downtime Strategy

### 2026-08-03 — ADR-067 Containerization Standards — completed

- Plan: `docs/execution/plans/ADR-067.md`
- Changes: root multi-stage `Dockerfile` (Next standalone, non-root `nextjs`, HEALTHCHECK → `/api/health`, no baked secrets) + `.dockerignore`; `next.config.ts` `output: "standalone"`; `app/api/health` liveness; `src/containerization` contract (12-factor, non-root, probes); `docs/tech/docker.md` pointer; ARD-019 Prod Dockerfile checked
- Validations: `npm run validate` green (688 tests)
- Iranian First: UX N/A (infra/contract-only); lean image / dockerignore protects mobile asset path; no delivery in image
- Docs updated: STATUS → completed; ADR-067 criteria checked; plan completion notes; ARD-019 STATUS note
- Next: ADR-069 CI/CD Strategy

### 2026-08-03 — ADR-089 Admin Dashboard Architecture — completed

- Plan: `docs/execution/plans/ADR-089.md`
- Changes: `src/admin-dashboard` — platform_admin shell, every view audited, merchants list/enforcement + mgmt portfolio widgets + security + audit browser stubs, Persian RTL + تومان + Jalali, `assertUiuxGate` evidence; enhanced `app/(admin)/admin` (+ merchants/security/audit) Persian routes; app-router filesystem sync; flipped admin-domain/mgmt UI pointers; ARD-018/022/025/026 notes
- Validations: `npm run validate` green (681 tests)
- Iranian First: uiuxpromax brief + gate; Persian chrome/privilege/enforcement; RTL tables; Jalali note; تومان GMV; mobile-readable alerts; pickup-only
- Docs updated: STATUS → completed; ADR-089 criteria checked; plan completion notes; ARD STATUS notes
- Next: ADR-067 Containerization Standards

### 2026-08-03 — ADR-013 Admin Domain — completed

- Plan: `docs/execution/plans/ADR-013.md`
- Changes: `src/admin-domain` contract + `src/modules/admin` (AdminUser, AdminAction, list/view/activate/suspend use cases, platform_admin AuthZ, AuditPort stub, SecurityMonitoringPort stub, Persian errors/privilege warnings); merchant suspend/reactivate + `MerchantSuspended` + list; Drizzle `admin_users`/`admin_actions` stubs; ARD-018/026 foundation notes
- Validations: `npm run validate` green (672 tests)
- Iranian First: Persian domain/error/privilege copy; UI/RTL/Jalali/تومان N/A (uiuxpromax → ADR-089)
- Docs updated: STATUS → completed; ADR-013 criteria checked; plan completion notes; ARD STATUS notes
- Next: ADR-089 Admin Dashboard Architecture

### 2026-08-03 — ADR-088 Merchant Dashboard Architecture — completed

- Plan: `docs/execution/plans/ADR-088.md`
- Changes: `src/merchant-dashboard` — merchant shell decision, AN-01..04 overview widgets conceptually wired to `merchant-oltp-analytics` (API paths + Persian titles), auth merchant_staff only, cache-aside TTL 60s, `DashboardWidgetViewed` reserved, Persian RTL copy + تومان + Jalali notes, `assertUiuxGate` evidence; enhanced `app/(merchant)/dashboard/page.tsx` Persian AN overview stubs; flipped ADR-063 UI stubs pointer; ARD-013/016 foundation notes
- Validations: `npm run validate` green (662 tests)
- Iranian First: uiuxpromax brief + gate; Persian dashboard chrome/KPIs/empty/auth; RTL shell; Jalali range note; تومان; mobile-first ~390px; pickup-only
- Docs updated: STATUS → completed; ADR-088 criteria checked; plan completion notes; ARD STATUS notes
- Next: ADR-013 Admin Domain

### 2026-08-03 — ADR-064 Data Retention Strategy — completed

- Plan: `docs/execution/plans/ADR-064.md`
- Changes: `src/data-retention` — retention matrix + Mongo TTL table (clickstream/sessions 90–180d, warehouse 24m, audit 24–36m), legal-hold override registry, soft-deleted membership grace ≥36m (longer than analytics), Persian privacy copy keys + RTL stubs; flipped data-integrity purge pointer, clickstream/session/audit/warehouse retentionAdr, mongodb-analytics placement; ARD-021/022/024/027 foundation notes; `data-retention-architecture.md` implementation pointer
- Validations: `npm run validate` green (653 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A); Persian privacy copy keys + RTL stubs; Jalali ops presentation deferred
- Docs updated: STATUS → completed; ADR-064 criteria checked; plan completion notes; ARD STATUS notes
- Next: ADR-088 Merchant Dashboard Architecture

### 2026-08-03 — ADR-062 Management Dashboard Analytics — completed

- Plan: `docs/execution/plans/ADR-062.md`
- Changes: `src/mgmt-dashboard-analytics` — Mongo `mos_mgmt` portfolio rollups (activation/engagement/commerce), platform_admin + audited access gate, DAM/MAM/GMV instrument notes (GMV labeled `mongo_proxy`, reconciles to PG), freshness SLAs (≤1m / ≤15m / T+1), Persian titles + metric labels, Jalali/`Asia/Tehran` presentation stub, overview/activation/engagement builders + in-memory store; flipped mongodb-analytics / analytics-boundaries mgmt pointers; ARD-025 / ARD-021 foundation notes; management-dashboards + mongodb architecture notes
- Validations: `npm run validate` green (644 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A → ADR-089 / ARD-025); Persian titles + RTL stubs; Jalali presentation stub; تومان display unit + GMV source labels
- Docs updated: STATUS → completed; ADR-062 criteria checked; plan completion notes; ARD-025 STATUS note
- Next: ADR-064 Data Retention Strategy

### 2026-08-03 — ADR-063 Merchant OLTP Dashboard Analytics — completed

- Plan: `docs/execution/plans/ADR-063.md`
- Changes: `src/merchant-oltp-analytics` — PG projections for AN-01..04 (overview/revenue/customers/retention North Star), sales + membership counter ports, AN-01 overview builder, Persian widget titles, Jalali/`Asia/Tehran` range helpers stub, Redis TTL 60s cache note (ADR-053 align); `src/modules/analytics` — overview use cases + idempotent `SaleCompleted` → daily revenue projection (in-memory); flipped analytics-boundaries merchant OLTP pointer; ARD-016 / analytics-architecture foundation notes
- Validations: `npm run validate` green (638 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A → ADR-088 / ARD-016); Persian titles + RTL stubs; Jalali range stub; تومان display unit note; tablet-skimable contract
- Docs updated: STATUS → completed; ADR-063 criteria checked; plan completion notes; ARD-016 STATUS note
- Next: ADR-062 Management Dashboard Analytics

### 2026-08-03 — ADR-061 Session Analytics — completed

- Plan: `docs/execution/plans/ADR-061.md`
- Changes: `src/session-analytics` — client UUID `sessionId`, heartbeat + 30m idle timeout, SessionStarted/SessionHeartbeat/SessionEnded → `mos_sessions` aggregates (duration, device class, entry/exit paths), Iran timezone notes (UTC store / Jalali `Asia/Tehran` presentation), Persian metric labels, `trackSession` via ADR-065 `best_effort_track`; in-memory store tests; flipped mongodb-analytics / analytics-boundaries / event-warehouse / clickstream session pointers; ARD-021/027 foundation notes
- Validations: `npm run validate` green (629 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A); Persian metric labels + RTL stubs; Iran TZ notes; Jalali session KPI viewer deferred to ARD-027
- Docs updated: STATUS → completed; ADR-061 criteria checked; plan completion notes; mongodb / user-behavior architecture `mos_sessions` notes
- Next: ADR-063 Merchant OLTP Dashboard Analytics

### 2026-08-03 — ADR-060 User Behavior and Clickstream Tracking — completed

- Plan: `docs/execution/plans/ADR-060.md`
- Changes: `src/clickstream` — PageViewed/ElementClicked/ScrollDepth (+ POS/storefront companions), `trackClickstream` + `ingestBeaconBatch` via ADR-065 `best_effort_track`, `mos_behavior` (ADR-056; colloquial `mos_clickstream`), POS critical + funnel companions 100% sample, noisy sampling, phone hash + secret scrub, Persian metric labels, CORS/beacon API reserve, TTL 90–180d stance; in-memory store tests; flipped mongodb-analytics / analytics-boundaries / event-warehouse pointers; ARD-021/027 foundation notes
- Sampling: POS critical + funnel companions = 1.0; ScrollDepth noisy default 0.1
- Validations: `npm run validate` green (616 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A); Persian metric labels + RTL stubs; phone privacy; Jalali path viewer deferred to ARD-027; sessions → ADR-061
- Docs updated: STATUS → completed; ADR-060 criteria checked; plan completion notes; ARD-021/027 notes
- Next: ADR-061 Session Analytics

### 2026-08-03 — ADR-059 Product Analytics Architecture — completed

- Plan: `docs/execution/plans/ADR-059.md`
- Changes: `src/product-analytics` — FeatureUsed + funnel registry (POS phone capture, QR, pickup, loyalty), feature keys, Persian metric/feature labels, `trackEvent` via ADR-065 `best_effort_track` isolation, `mos_product` (+ `mos_product_rollups` name), phone hash + secret scrub, dual-read money from PG; in-memory store tests; flipped mongodb-analytics / analytics-boundaries / event-warehouse pointers; ARD-021/023 foundation notes
- Funnels: pos_phone_capture, qr_acquisition, pickup, loyalty (100% sample)
- Validations: `npm run validate` green (605 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A); Persian metric/funnel labels + RTL stubs; phone privacy; Jalali merchant viewer deferred to ARD-023
- Docs updated: STATUS → completed; ADR-059 criteria checked; plan completion notes; ARD-021/023 notes
- Next: ADR-060 User Behavior and Clickstream Tracking

### 2026-08-03 — ADR-058 Audit Logging Architecture — completed

- Plan: `docs/execution/plans/ADR-058.md`
- Changes: `src/audit-logging` — insert-only Mongo `mos_audit` via AuditPort, async fail-open (never blocks OLTP), Iranian phone PII scrubbing, Persian action labels, sensitive-action matrix, tenant search, access-itself-audited helper; in-memory store tests; flipped data-integrity / security-architecture / mongodb-analytics / event-warehouse / rate-limiting / multi-tenant pointers; ARD-021/022 foundation notes
- Event matrix: auth (otp_anomaly/login/logout_all/role_change), merchant (create/activate/suspend/settings_billing), catalog/stock (price_hard_change/adjust/mass_delete), sale (complete/cancel), loyalty (redeem/manual_adjust), order/payment transitions, admin.platform_action, privacy soft_delete/export, audit.view, rate_limit.triggered
- Validations: `npm run validate` green (595 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A); Persian action labels + RTL stubs; phone scrub preserves Persian UTF-8; Jalali admin viewer deferred to ARD-022
- Docs updated: STATUS → completed; ADR-058 criteria checked; plan completion notes; ARD-021/022 notes
- Next: ADR-059 Product Analytics Architecture

### 2026-08-03 — ADR-057 Event Warehouse Architecture — completed

- Plan: `docs/execution/plans/ADR-057.md`
- Changes: `src/event-warehouse` — append-only Mongo `mos_events` domain event mirror, idempotent outbox `mongodb_warehouse` consumer, tenant fields, lag metrics, TTL 24m stance, Persian UTF-8 payload safety; in-memory store tests; flipped event-driven / outbox / analytics-boundaries / mongodb-analytics / analytics-ingest-isolation / event-naming deferrals; ARD-021/024 foundation notes
- Validations: `npm run validate` green (588 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A); UTF-8 Persian payload round-trip; Jalali presentation deferred to dashboards (ADR-014)
- Docs updated: STATUS → completed; ADR-057 criteria checked; plan completion notes; ARD-021/024 notes
- Next: ADR-058 Audit Logging Architecture

### 2026-08-03 — ADR-065 Analytics Ingest Failure Isolation — completed

- Plan: `docs/execution/plans/ADR-065.md`
- Changes: `src/analytics-ingest-isolation` — fire-and-forget ingest buffer/queue, retry then dead-letter (domain/audit) or drop (best-effort track), ingest metrics; isolating `AnalyticsIngestPort` + `createAnalyticsAfterSalePort`; CompleteSale optional `analyticsAfterSale` fail-open after OLTP persist; flipped ADR-056 / event-driven / pos-sales isolation pointers; ARD-021 Mongo-down / POS-unaffected notes
- Validations: `npm run validate` green (581 tests)
- Iranian First: UX screens N/A (uiuxpromax N/A); Persian ops stubs for future DLQ; checkout path never blocked by Mongo for Iranian cashiers
- Docs updated: STATUS → completed; ADR-065 criteria checked; plan completion notes; ARD-021 / docs/ards STATUS
- Next: ADR-057 Event Warehouse Architecture

### 2026-08-03 — ADR-056 MongoDB Analytics and Telemetry Plane — completed

- Plan: `docs/execution/plans/ADR-056.md`
- Changes: `src/mongodb-analytics` — analytics-only plane (never OLTP/money/stock/membership SoT), locked `mos_*` collections, canonical document envelope, `MONGODB_URL` connection, tenant filters + platform_admin gates, off-checkout-path + failure isolation → ADR-065 / warehouse → ADR-057; thin `src/infrastructure/mongodb/client.ts` stub; compose `mongo` verified; ADR-014/ARD-021 foundation flips; tech + architecture env key aligned to `MONGODB_URL`
- Validations: `npm run validate` green (573 tests)
- Iranian First: UTF-8 Persian telemetry payload safety; Jalali/`Asia/Tehran` presentation pointer (ADR-014); UX screens N/A (uiuxpromax N/A)
- Docs updated: STATUS → completed; ADR-056 criteria checked; plan completion notes; ARD-021 foundations; mongodb tech/architecture env alignment
- Next: ADR-065 Analytics Ingest Failure Isolation

### 2026-08-03 — ADR-014 Analytics Domain Boundaries OLTP vs Mongo — completed

- Plan: `docs/execution/plans/ADR-014.md`
- Changes: `src/analytics-boundaries` — PG OLTP merchant dashboards (AN-01..04) vs Mongo warehouse/product/audit/clickstream plane; money truth stays PostgreSQL; Mongo never OLTP SoT; analytics/warehouse off checkout critical path; admin-only platform analytics; Persian + Jalali/`Asia/Tehran` + RTL merchant report UX contract; assert helpers aligned with product-architecture / bounded-contexts / event-driven / compose
- Validations: `npm run validate` green (563 tests)
- Iranian First: Persian report titles/labels + RTL + Jalali/Tehran time buckets + تومان unit note on UX contract; live charts/screens N/A (uiuxpromax N/A → ADR-063 / ARD-016)
- Docs updated: STATUS → completed; ADR-014 criteria checked; plan completion notes; ARD-016/021 foundation notes
- Next: ADR-056 MongoDB Analytics and Telemetry Plane

### 2026-08-03 — ADR-090 Notification Architecture — completed

- Plan: `docs/execution/plans/ADR-090.md`
- Changes: `src/notifications-architecture` + `src/modules/notifications` — persisted in-app notifications, SMS channel ports (mock/console; campaigns later via credits), Persian templates, outbox `notifications` consumer (OrderCreated / OrderReadyForPickup / InventoryLowDetected / InventoryDepleted), OTP SMS never logs codes, list/mark-read use cases, Drizzle `notifications` schema stub; event-driven + outbox pointers flipped; ARD-014 foundation note
- Validations: `npm run validate` green (556 tests)
- Iranian First: Persian in-app/SMS templates + RTL UX contract; OTP log redaction; center UI screens N/A (uiuxpromax N/A → ARD-014); never block checkout TX
- Docs updated: STATUS → completed; ADR-090 criteria checked; plan completion notes; ARD-014 STATUS note
- Next: ADR-014 Analytics Domain Boundaries OLTP vs Mongo (Phase F start)

### 2026-08-03 — ADR-039 Realtime Client Strategy MQTT with Poll Fallback — completed

- Plan: `docs/execution/plans/ADR-039.md`
- Changes: `src/realtime-client` — MQTT-over-WebSocket preferred transport port + in-memory adapter, TanStack Query channel invalidation, HTTP poll fallback on disconnect (15s), exponential reconnect backoff (jitter, 30s cap), Persian RTL reconnect/offline/poll toast copy; `handleRealtimeTokenRequest` + `app/api/v1/realtime/token/route.ts`; ADR-038 client deferrals flipped; arch/tech + ARD-015/001/014 notes
- Validations: `npm run validate` green (546 tests)
- Iranian First: Persian reconnect/offline/poll-fallback copy + `dir=rtl`; UX screens N/A (uiuxpromax N/A); mobile backoff + poll-only-when-disconnected
- Docs updated: STATUS → completed; ADR-039 criteria checked; plan completion notes; ARD-015 token/client/poll checkboxes
- Next: ADR-090 Notification Architecture

### 2026-08-03 — ADR-038 EMQX Event Bus / Realtime Architecture — completed

- Plan: `docs/execution/plans/ADR-038.md`
- Changes: `src/emqx-realtime` — EMQX MQTT tenant topics (`mos/{env}/merchant/{merchantId}/…`), event→channel map, QoS1 `EmqxPublishPort`, ACL + short-lived cred mint, outbox `emqx_realtime` handler, `InMemoryMqttBroker` for tests, Persian RTL UX stubs; thin `src/infrastructure/emqx/client.ts` (`MQTT_URL`); compose emqx verified; ADR-035/036 deferrals flipped; ARD-015/001 notes
- Validations: `npm run validate` green (540 tests)
- Iranian First: Persian realtime/offline/toast copy stubs + `dir=rtl`; UX screens N/A; checkout never blocked by publish
- Docs updated: STATUS → completed; ADR-038 criteria checked; plan completion notes; ARD-015 foundation (token HTTP + MQTT client + poll → ADR-039)
- Next: ADR-039 Realtime Client Strategy MQTT with Poll Fallback

### 2026-08-03 — ADR-024 Offline-First Staff POS Strategy — completed

- Plan: `docs/execution/plans/ADR-024.md`
- Changes: `src/pos-offline` — online P0 / offline sale-queue P1, reject-and-review stock conflicts (ADR-091), idempotent sync keys, sync API contract `POST /api/v1/sales/sync`, `SaleCompleted` on successful flush, Persian shop-floor banners, in-memory queue helper + IDB port, staff SW `public/sw-staff.js`; POS `StaffOfflineStatus` + install offline copy; `staff-pwa` offline points at package; ARD-017 SW/IDB/sync/banner checkboxes
- Validations: `npm run validate` green (529 tests)
- Iranian First: Persian offline/queue/conflict/sync copy; `lang=fa`/`dir=rtl`; touch ≥44px review CTA; تومان wording; Jalali N/A on banners
- Docs updated: STATUS → completed; ADR-024 criteria checked; plan completion notes; ARD-017 in_progress (browser IDB e2e + HTTP sync route remain)
- Next: ADR-038 EMQX Event Bus / Realtime Architecture

### 2026-08-03 — ADR-022 Merchant Staff PWA Architecture — completed

- Plan: `docs/execution/plans/ADR-022.md`
- Changes: `src/staff-pwa` — MerchantOS staff PWA (≠ store customer ADR-023), manifest `/staff/manifest.webmanifest`, `start_url`→`/pos`, Persian RTL install + offline-reserved banner, merchant staff JWT only, httpOnly cookie isolation note, `AppOpened` source=`staff-pwa` reserved; POS install chrome + manifest Route Handler; default SVG icon; app-router + middleware `/staff` synced; ARD-017 foundations (SW/IDB/sync → ADR-024)
- Validations: `npm run validate` green (521 tests)
- Iranian First: Persian install/offline/cashier copy; `lang=fa`/`dir=rtl`; touch ≥44px; تومان in cashier hint; Jalali N/A on install chrome
- Docs updated: STATUS → completed; ADR-022 criteria checked; plan completion notes; ARD-017 in_progress foundations
- Next: ADR-024 Offline-First Staff POS Strategy

### 2026-08-03 — ADR-087 Customer Dashboard Architecture — completed

- Plan: `docs/execution/plans/ADR-087.md`
- Changes: `src/customer-dashboard` — store-membership-scoped portal contract, auth required (`role=customer`), no cross-store leak / no merchant chrome, ARD-035 API paths reserved, wallet/history cache TTL band, `LoyaltyWalletViewed`/`ReceiptViewed` reserved, Persian copy + تومان + Jalali note, `assertUiuxGate` evidence; storefront routes `/s/{storeSlug}/dashboard` (+ orders/wallet) Persian RTL stubs; home nav «پنل من»; app-router filesystem synced; ARD-035 foundations note
- Validations: `npm run validate` green (514 tests)
- Iranian First: Persian dashboard chrome/empty/auth; `lang=fa`/`dir=rtl`; تومان; Jalali date note; membership-scoped; PWA-first mobile nav ≥44px; live wallet/JWT middleware N/A
- Docs updated: STATUS → completed; ADR-087 criteria checked; plan completion notes; ARD-035 remains todo (APIs remain)
- Next: ADR-022 Merchant Staff PWA Architecture

### 2026-08-03 — ADR-012 Payment Domain — completed

- Plan: `docs/execution/plans/ADR-012.md`
- Changes: `src/payments-domain` + `src/modules/payments` — PaymentIntent aggregate; PaymentGateway port + Sandbox/Mock adapter (ADR-084 Proposed, no real PSP); webhook HMAC verify stub; Persian errors; FEE_POLICY inactive (ADR-091 Kerman pilot); Ordering default `paymentConfirm` → sandbox adapter → OrderPaid with `paymentId`; Drizzle `payments` stub; Payment* events in catalog
- Validations: `npm run validate` green (506 tests)
- Iranian First: Persian payment/status/error copy; IRR minor money; Iranian PSP port (sandbox only); UI/RTL/Jalali screens N/A (uiuxpromax N/A → ARD-012/034)
- Docs updated: STATUS → completed; ADR-012 criteria checked; plan completion notes; ARD-012 remains todo (HTTP intents/webhooks + Kit migrations)
- Next: ADR-087 Customer Dashboard Architecture

### 2026-08-03 — ADR-082 Pickup-Only Fulfillment MVP Decision — completed

- Plan: `docs/execution/plans/ADR-082.md`
- Changes: `src/pickup-only` — pickup-only fulfillment contract aligning product-architecture + ordering; forbid delivery/courier/rider_fleet/shipping capabilities; reject forbidden URL segments + aliases (`deliver`/`dispatch`/…); ADR-091 timers (30m unpaid / 24h ready hold, no silent refund); Persian pickup copy (آماده تحویل، فقط دریافت حضوری); ARD-034 foundations note
- Validations: `npm run validate` green (493 tests)
- Iranian First: Persian pickup labels/instructions on contract; pickup-only neighborhood retail; UI/RTL/Jalali/تومان screens N/A (uiuxpromax N/A → ARD-034)
- Docs updated: STATUS → completed; ADR-082 criteria checked; plan completion notes; ARD-034 remains todo (checkout/board UI)
- Next: ADR-012 Payment Domain

### 2026-08-03 — ADR-011 Pickup Order Architecture — completed

- Plan: `docs/execution/plans/ADR-011.md`
- Changes: `src/ordering-domain` + `src/modules/ordering` — pickup-only Order aggregate lifecycle (pending_payment→paid→preparing→ready_for_pickup→picked_up→completed|cancelled|refunded); ADR-091 timers (30m unpaid auto-cancel, 24h ready hold → cancel without silent refund); Persian status labels/errors; PaymentConfirmPort + InventoryReserve/Release stubs; Drizzle `orders`/`order_lines` stubs; Order* events marked implemented (OrderDelivered outOfMvp)
- Validations: `npm run validate` green (485 tests)
- Iranian First: Persian status labels + domain errors; IRR minor money; pickup-only neighborhood retail; UI/RTL/Jalali N/A (domain only; uiuxpromax N/A)
- Docs updated: STATUS → completed; ADR-011 criteria checked; plan completion notes; ARD-011 remains todo (API/migrations/UI)
- Next: ADR-082 Pickup-Only Fulfillment MVP Decision

### 2026-08-03 — ADR-081 QR Acquisition Architecture Decision — completed

- Plan: `docs/execution/plans/ADR-081.md`
- Changes: `src/qr-acquisition` — QR encodes storefront canonical URL + `?src=qr` via `buildQrTargetUrl`/`buildStorefrontPath`; MinIO `qr` StoreQrRef; Persian sticker print notes + landing copy; attribution events (`StoreQrGenerated`, `StorefrontVisited`/`MembershipCreated` source=`qr`); API paths reserved; ARD-033 foundations
- Validations: `npm run validate` green (470 tests)
- Iranian First: Persian sticker/landing copy; RTL via storefront; CTA ≥44px; physical window-QR growth loop; Jalali/تومان N/A on QR artifacts
- Docs updated: STATUS → completed; ADR-081 criteria checked; plan completion notes; ARD-033 in_progress foundations
- Next: ADR-011 Pickup Order Architecture

### 2026-08-03 — ADR-023 Store Customer PWA Architecture — completed

- Plan: `docs/execution/plans/ADR-023.md`
- Changes: `src/store-customer-pwa` — per-store customer PWA (≠ staff ADR-022), manifest path `/s/{slug}/manifest.webmanifest`, `start_url`→storefront, Persian RTL install copy, offline catalog read-mostly note, customer JWT only, install events reserved; storefront manifest Route Handler + install banner; default SVG icon; app-router filesystem sync; ARD-029 foundations
- Validations: `npm run validate` green (464 tests)
- Iranian First: Persian install chrome; `lang=fa`/`dir=rtl`; CTA ≥44px; QR→PWA→pickup loop; Jalali/تومان N/A on install banner
- Docs updated: STATUS → completed; ADR-023 criteria checked; plan completion notes; ARD-029 in_progress foundations
- Next: ADR-081 QR Acquisition Architecture Decision

### 2026-08-03 — ADR-032 Customer SMS OTP Authentication — completed

- Plan: `docs/execution/plans/ADR-032.md`
- Changes: `src/customer-auth` — customer audience `role=customer`, distinct `/api/v1/customer/auth/*`, explicit ADR-091 consent checkbox, forbid merchant APIs; `src/modules/customer-identity` — OTP request/verify (separate hash namespace), Persian errors + SMS template, SmsPort mock/console, `CustomerLoggedIn`/`CustomerLoggedOut`; ARD-030 partial foundations note
- Validations: `npm run validate` green (457 tests)
- Iranian First: Persian OTP/errors/consent; Iranian `09`/`+98`; RTL/Jalali/تومان / OTP screens N/A (uiuxpromax N/A → ADR-023)
- Docs updated: STATUS → completed; ADR-032 criteria checked; plan completion notes
- Next: ADR-023 Store Customer PWA Architecture

### 2026-08-03 — ADR-086 Storefront Architecture — completed

- Plan: `docs/execution/plans/ADR-086.md`
- Changes: `src/storefront-architecture` — dedicated path URL `/s/{storeSlug}`, public ACL catalog/ordering only, branding fields, Persian pickup CTA (no delivery/marketplace), forbid POS domain imports, public revalidate 600s, `StorefrontVisited` reserved, uiuxpromax gate evidence; enhanced `(storefront)` home + catalog/about Persian RTL stubs; synced app-router filesystem; ARD-010 note
- Validations: `npm run validate` green (442 tests)
- Iranian First: Persian storefront copy + SEO; `lang=fa`/`dir=rtl`; empty catalog stub; mobile CTA ≥44px; pickup-only; تومان label on catalog; Jalali hours / OTP / live PDP N/A
- Docs updated: STATUS → completed; ADR-086 criteria checked; plan completion notes
- Next: ADR-032 Customer SMS OTP Authentication

### 2026-08-03 — ADR-028 Frontend Error Handling UX — completed

- Plan: `docs/execution/plans/ADR-028.md`
- Changes: `src/frontend-error-ux` — map API/domain codes→Persian UI; toast/inline/boundary presentation; sanitize (no English stacks / OTP leaks); barcode-miss + OTP recovery CTAs; optimistic-only-when-safe; optional correlationId support hint; `MerchantErrorBoundary`; synced ui-rules + ARD-001/007 notes
- Validations: `npm run validate` green (433 tests)
- Iranian First: Persian error/toast/boundary copy; fa/rtl contract; OTP-safe; inline above-keyboard; mobile retry ≥44px; Jalali/تومان/full product screens N/A
- Docs updated: STATUS → completed; ADR-028 criteria checked; plan completion notes
- Next: ADR-086 Storefront Architecture

### 2026-08-03 — ADR-027 Form and Validation Strategy — completed

- Plan: `docs/execution/plans/ADR-027.md`
- Changes: `zod` + `react-hook-form` + `@hookform/resolvers` + `src/forms-validation` — RHF+Zod decision; Persian error catalog; Iranian mobile schema/normalize; تومان↔rial helpers + money/OTP/text schemas; `createZodFormResolver`; never trust client alone; synced zod/react-hook-form/ui-rules + ARD-001/007 notes
- Validations: `npm run validate` green (425 tests)
- Iranian First: Persian validation messages; fa/rtl form contract; Iranian phone `09…`/`+98`; تومان format/parse; Jalali form fields/screens N/A
- Docs updated: STATUS → completed; ADR-027 criteria checked; plan completion notes
- Next: ADR-028 Frontend Error Handling UX

### 2026-08-03 — ADR-026 Data Fetching Strategy — completed

- Plan: `docs/execution/plans/ADR-026.md`
- Changes: `@tanstack/react-query` + `src/data-fetching` — RSC dashboards/marketing; TanStack Query POS/CRM; Route Handlers JSON; `createMerchantQueryClient` + `MerchantQueryProvider` stub; per-surface staleTimes (POS shorter); no ad-hoc useEffect fetch; scoped keys; logout cache clear; Persian RTL placeholders; state-management path wired to data-fetching; synced tanstack-query/nextjs/zustand/ui/nextjs rules + ARD-001/007 notes
- Validations: `npm run validate` green (418 tests)
- Iranian First: Persian Unicode in query cache; fa/rtl placeholders (no EN flash); snappy POS staleTime / no RSC waterfall; Jalali/تومان formatters N/A (no screens)
- Docs updated: STATUS → completed; ADR-026 criteria checked; plan completion notes
- Next: ADR-027 Form and Validation Strategy

### 2026-08-03 — ADR-025 State Management Strategy — completed

- Plan: `docs/execution/plans/ADR-025.md`
- Changes: `src/state-management` — server state via fetching lib (TanStack Query ownership, install ADR-026); client UI local/Context; Zustand POS cart (`createPosCartStore`) + `src/modules/pos/ui/state`; URL filter helpers; no Redux mandate; Persian RTL placeholders; logout clear; synced zustand/tanstack-query/ui-rules + ARD-001/007 notes
- Validations: `npm run validate` green (410 tests)
- Iranian First: Persian Unicode in cart/URL; fa/rtl placeholders (no EN flash); mobile snappy cart rule; Jalali/تومان formatters N/A (no screens)
- Docs updated: STATUS → completed; ADR-025 criteria checked; plan completion notes
- Next: ADR-026 Data Fetching Strategy

### 2026-08-03 — ADR-021 uiuxpromax Mandatory for UI — completed

- Plan: `docs/execution/plans/ADR-021.md`
- Changes: `src/uiuxpromax-gate` contract — mandatory before UI, protocol, Persian+RTL brief requirements (fa-IR persona, 390px mobile, Iranian retail terms), `assertUiuxGate` / `assertUiuxBrief`, filesystem asserts for skill + `docs/uiux/*`; synced `.cursor/skills/uiuxpromax-integration`, `docs/skills/uiuxpromax-integration.md`, `docs/uiux/uiux-system.md`; ARD-001 note
- Validations: `npm run validate` green (403 tests)
- Iranian First: briefs must declare Persian + RTL + fa-IR + Iranian retail context; no product screens; Jalali/تومان N/A
- Docs updated: STATUS → completed; ADR-021 criteria checked; plan completion notes
- Next: ADR-025 State Management Strategy (Phase D also lists 026–028 after frontend system)

### 2026-08-03 — ADR-020 Tailwind Design System Strategy — completed

- Plan: `docs/execution/plans/ADR-020.md`
- Changes: Tailwind v4 + PostCSS; `app/globals.css` CSS-variable tokens (Iranian retail teal/daylight); Vazirmatn via `next/font` on root layout; `src/tailwind-design-system` contract (RTL logical props, density ≥44px, ban purple AI aesthetic); `cn` → clsx + tailwind-merge; shadcn deferred flags cleared; synced `docs/tech/tailwindcss.md` / shadcn note
- Validations: `npm run validate` green (396 tests); `npm run build` green
- Iranian First: fa/rtl shell + Vazirmatn + logical CSS tokens; Jalali/تومان N/A (no domain UI); uiux via docs gate (no uiuxpromax binary)
- Docs updated: STATUS → completed; ADR-020 criteria checked; plan completion notes; ARD-001 note
- Next: ADR-021 uiuxpromax Mandatory for UI

### 2026-08-03 — ADR-019 shadcn/ui Strategy — completed

- Plan: `docs/execution/plans/ADR-019.md`
- Changes: `src/shadcn-strategy` contract — shadcn owned-copy primitive vendor, generate into `src/components/ui`, forbid MUI/Chakra/etc., RTL-first + Iranian adapters, CLI/`cn` placement; root `components.json` stub (`rtl: true`); `src/lib/utils.ts` dep-free `cn` stub; visuals/tokens deferred to ADR-020; synced `docs/tech/shadcn-ui.md`
- Validations: `npm run validate` green (387 tests)
- Iranian First: RTL/logical + Persian capacity + no Western-only date/currency subcomponents in contract; fa/rtl root unchanged; Jalali/تومان N/A (no primitives yet); uiux via docs gate (no uiuxpromax binary)
- Docs updated: STATUS → completed; ADR-019 criteria checked; plan completion notes
- Next: ADR-020 Tailwind Design System Strategy

### 2026-08-03 — ADR-018 Frontend Component Architecture — completed

- Plan: `docs/execution/plans/ADR-018.md`
- Changes: `src/frontend-components` contract — layers primitives/composites/domain, paths under `src/components/`, domain folders (no delivery), presentational bans (no business logic/DB/domain imports), RTL logical props + density variants; scaffolded empty `ui`/`composites`/`domain/*` with `.gitkeep`; wired `nextjs-architecture` components paths; synced react/nextjs/shadcn/component-library docs
- Validations: `npm run validate` green (380 tests)
- Iranian First: RTL/logical CSS + Persian capacity in contract; fa/rtl root unchanged; Jalali/تومان N/A (empty shells); uiux via docs gate (no uiuxpromax binary)
- Docs updated: STATUS → completed; ADR-018 criteria checked; plan completion notes
- Next: ADR-019 shadcn/ui Strategy

### 2026-08-03 — ADR-017 App Router Structure — completed

- Plan: `docs/execution/plans/ADR-017.md`
- Changes: `src/app-router-structure` contract — route groups `(marketing)`/`(merchant)`/`(storefront)`/`(admin)` + `api/v1`, storefront `/s/[storeSlug]`, forbid delivery segments, coarse audience classifier; scaffolded thin Persian pages + group layouts; Edge-safe `middleware.ts` sets `x-mos-route-audience`; synced `nextjs-architecture` rootPage + `docs/tech/nextjs.md`
- Validations: `npm run validate` green (373 tests); `npm run build` green
- Iranian First: fa placeholder shells; root `lang=fa`/`dir=rtl`; Jalali/تومان N/A; no delivery routes
- Docs updated: STATUS → completed; ADR-017 criteria checked; plan completion notes; ARD-001/010/018 notes
- Next: ADR-018 Frontend Component Architecture

### 2026-08-03 — ADR-040 File Storage MinIO Strategy — completed

- Plan: `docs/execution/plans/ADR-040.md`
- Changes: `src/minio-storage` — S3 `ObjectStoragePort` + in-memory adapter (put/get/delete + presigned upload/download), buckets receipts/media/qr, private + type/size limits, `ReceiptRef` VO, UTF-8 fa filename metadata, merchant-scoped keys; thin `src/infrastructure/minio/client.ts` env stub; verified compose MinIO; synced storage-architecture / minio.md / pos-sales / ARD-001/007/033 notes
- Validations: `npm run validate` green (366 tests)
- Iranian First: UTF-8 Persian filename metadata encode/decode; UX/RTL/Jalali/تومان N/A (no screens)
- Docs updated: STATUS → completed; ADR-040 criteria checked; plan completion notes
- Next: ADR-017 App Router Structure

### 2026-08-03 — ADR-054 Cache Invalidation via Domain Events — completed

- Plan: `docs/execution/plans/ADR-054.md`
- Changes: `src/cache-invalidation` — event→key maps for SaleCompleted/ProductUpdated/StoreUpdated (`keysForEvent`), `invalidateOnEvent` fail-open deletes via cache-aside store port + in-memory tests; wired redis/outbox/event-driven placement; synced cache-strategy / redis.md / ARD-001
- Validations: `npm run validate` green (357 tests)
- Iranian First: keys ID-based; deletes preserve sibling Persian UTF-8 values; UX/RTL/Jalali/تومان N/A (no screens)
- Docs updated: STATUS → completed; ADR-054 criteria checked; plan completion notes
- Next: ADR-040 File Storage MinIO Strategy

### 2026-08-03 — ADR-053 Cache Key and TTL Standards — completed

- Plan: `docs/execution/plans/ADR-053.md`
- Changes: `src/cache-keys` — pattern `mos:{env}:m:{merchantId}:{domain}:{resource}:{id}`, TTL classes (entity 300s / analytics dashboard 60s / storefront 600s), store/product/dashboard builders + membership/wallet with storeId, tenant asserts; wired `cache-aside` TTL hints + `redis-architecture` realization flags; synced `cache-strategy.md` / `docs/tech/redis.md` / barcode keyHint `m:` segment
- Validations: `npm run validate` green (347 tests)
- Iranian First: keys ID-based; UX/RTL/Jalali/تومان N/A (no screens); Persian values unchanged (ADR-052)
- Docs updated: STATUS → completed; ADR-053 criteria checked; plan completion notes; ARD-001 note
- Next: ADR-054 Cache Invalidation via Domain Events

### 2026-08-03 — ADR-052 Cache-Aside Read Strategy — completed

- Plan: `docs/execution/plans/ADR-052.md`
- Changes: `src/cache-aside` — get-or-load (`createCacheAside` / `getOrLoad`), `CacheAsideStorePort` + `InMemoryCacheAsideStore`, Redis never SoT, null caching policy (default off; opt-in negative sentinel), fail-open on store errors, optional single-flight stampede control, Persian UTF-8 JSON serialize; synced `redis-architecture` + `docs/tech/redis.md`
- Validations: `npm run validate` green (340 tests)
- Iranian First: Persian payload UTF-8 intact (tested); UX/RTL/Jalali/تومان N/A (no screens)
- Docs updated: STATUS → completed; ADR-052 criteria checked; plan completion notes; ARD-001 note
- Next: ADR-053 Cache Key and TTL Standards

### 2026-08-03 — ADR-035 Background Jobs and Transactional Outbox — completed

- Plan: `docs/execution/plans/ADR-035.md`
- Changes: `src/outbox` worker skeleton — `OutboxMessage`, `InMemoryOutboxStore`, poll/dispatch (`createOutboxWorker`), idempotent `InMemoryProcessedSet`, fan-out consumer slots (cache/EMQX/warehouse/notifications); scheduled job hooks for pickup unpaid cancel (30m) + ready hold (24h) + loyalty expiry (12m) via mvp-policies; Persian worker UX stubs; Drizzle stubs `outbox_events`/`processed_events`; ADR-036 pointer → `src/outbox`; ARD-001/015/024 notes
- Validations: `npm run validate` green (333 tests)
- Iranian First: fa notification/job copy + RTL note; wire schemas English; UI/Jalali/تومان N/A
- Docs updated: STATUS → completed; ADR-035 criteria checked; plan completion notes
- Next: ADR-052 Cache-Aside Read Strategy

### 2026-08-03 — ADR-037 Event Naming and Schema Governance — completed

- Plan: `docs/execution/plans/ADR-037.md`
- Changes: `src/event-naming` contract — past-tense PascalCase (forbid CreateX), `payloadVersion` versioning + breaking-bump asserts, light in-repo schema registry (catalog + store-first addendum authoritative; doc update same PR), MVP catalog from domains + addendum with `OrderDelivered` out of MVP; DDD past-tense suffixes for pickup events; ADR-036 schemaEvolution pointer → `src/event-naming`; ARD-024 catalog foundation note
- Validations: `npm run validate` green (327 tests)
- Iranian First: fa toast/drawer copy + RTL note; wire schemas English; UI/Jalali/تومان N/A
- Docs updated: STATUS → completed; ADR-037 criteria checked; plan completion notes
- Next: ADR-035 Background Jobs and Transactional Outbox

### 2026-08-03 — ADR-036 Event-Driven Architecture — completed

- Plan: `docs/execution/plans/ADR-036.md`
- Changes: `src/event-driven` contract — domain events → canonical envelope (`createEventEnvelope` / `envelopeFromDomainEvent`), transactional outbox concept (same TX, `outbox_events` / `processed_events`), at-least-once + retry/DLQ + idempotent consumers, fan-out cache/realtime/analytics/notifications with analytics off checkout critical path, Persian toast/drawer copy stubs + log scrub; aligned with modular-monolith `OUTBOX_SPINE`; ARD-014/015/021 foundation notes
- Validations: `npm run validate` green (320 tests)
- Iranian First: fa realtime/notification copy + RTL drawer note; wire schemas English; UI/Jalali/تومان N/A
- Docs updated: STATUS → completed; ADR-036 criteria checked; plan completion notes
- Next: ADR-037 Event Naming and Schema Governance

### 2026-08-03 — ADR-010 Loyalty Architecture — completed

- Plan: `docs/execution/plans/ADR-010.md`
- Changes: `src/loyalty-domain` contract — Wallet→store_membership, append-only PointsLedger, earn on POS/paid pickup, expiry 12m after last earn (ADR-091 configurable/disableable), Persian copy; `src/modules/loyalty` PointRule/Wallet/ledger + earn/redeem/expire use cases, `createLoyaltyEarnPort` for POS, Persian LoyaltyDomainError, in-memory repos; Drizzle stubs `point_rules`/`wallets`/`points_ledger`/`coupons`; ARD-009 domain foundations noted (API/migrations/UI/job worker/coupons remain)
- Validations: `npm run validate` green (312 tests)
- Iranian First: fa errors + امتیاز/کیف امتیاز copy; تومان via IRR minor earn; UI/RTL/Jalali N/A
- Docs updated: STATUS → completed; ADR-010 criteria checked; plan completion notes
- Next: ADR-036 Event-Driven Architecture

### 2026-08-03 — ADR-009 POS and Sales Domain — completed

- Plan: `docs/execution/plans/ADR-009.md`
- Changes: `src/pos-sales` contract — CompleteSale UoW, tender cash|card_terminal|mixed (ADR-091), Idempotency-Key, <5s budget, Persian POS speed notes + tender labels; `src/modules/pos` Cart/Sale + SaleLine, SaleCompleted/SaleCreated, `completeSale` (validate cart → tender → MembershipUpsertPort → InventoryDecrementPort same TX → LoyaltyEarnPort stub → persist), Persian PosDomainError, in-memory sale repo (merchant+idempotency); Drizzle stubs `sales`/`sale_lines` unique `(merchant_id, idempotency_key)`; ARD-007 domain foundations noted (API/migrations/UI/receipt remain)
- Validations: `npm run validate` green (299 tests)
- Iranian First: fa errors + tender labels + speed notes; phone required at checkout; تومان via IRR minor; UI/RTL N/A
- Docs updated: STATUS → completed; ADR-009 criteria checked; plan completion notes
- Next: ADR-010 Loyalty Architecture

### 2026-08-03 — ADR-007 Customer Membership Model — completed

- Plan: `docs/execution/plans/ADR-007.md`
- Changes: `src/crm-membership` contract — store-scoped StoreMembership, sources pos|qr|storefront|pickup, ADR-091 consent surfaces, Persian POS notice + digital checkbox labels; `src/modules/crm` aggregate (merchantId/storeId/customerId/phone), MembershipCreated/Updated, `upsertFromPosPhoneCapture` + `joinWithDigitalConsent` + soft-delete, Persian CrmDomainError, in-memory repo; Drizzle stub `store_memberships` unique partial `(store_id, phone_national)` / `(store_id, customer_id)` where deleted_at IS NULL; ARD-031 domain foundations noted (API/migrations/UI remain)
- Validations: `npm run validate` green (289 tests)
- Iranian First: fa errors + consent copy; Iranian mobile `09…`/`+98`; UI/RTL N/A
- Docs updated: STATUS → completed; ADR-007 criteria checked; plan completion notes
- Next: ADR-009 POS and Sales Domain

### 2026-08-03 — ADR-049 Inventory Synchronization Strategy — completed

- Plan: `docs/execution/plans/ADR-049.md`
- Changes: `src/inventory-sync` — CompleteSale same-TX decrement, pickup hard-decrement on `paid` (idempotent preparing), optimistic `stock_items.version`, offline reject-and-review (ADR-091), Inventory* cache/realtime invalidation + Persian messages; inventory hooks `decrementForSale` / `decrementForPickupPaid` / `restorePickupStock` / `rejectOfflineStockConflict`; InventoryChanged + InventoryLowDetected + InventoryDepleted (ADR-002 past tense); optimistic repo lock + sync idempotency port; inventory-domain sync pointer → ADR-049
- Validations: `npm run validate` green (278 tests)
- Iranian First: Persian shop-floor sync/conflict/offline-reject errors; UI/RTL N/A
- Docs updated: STATUS → completed; ADR-049 criteria checked; plan completion notes; ARD-006 sync note
- Next: ADR-007 Customer Membership Model

### 2026-08-03 — ADR-050 Search and Barcode Scanning Strategy — completed

- Plan: `docs/execution/plans/ADR-050.md`
- Changes: `src/search-barcode` — B-tree merchant+barcode, Redis barcode cache TTL 300s, pg_trgm/client fuzzy + BarcodeDetector fallback contracts, lightweight Persian normalize (trim + Eastern/Western digits), scan analytics stubs, NFR budgets; catalog application `lookupByBarcode` / `searchByName` (tenant-scoped, soft-delete excluded); synced catalog-domain / indexing / query-design pointers; ARD-005/007 notes
- Validations: `npm run validate` green (269 tests)
- Iranian First: fa product name search + Persian scan/miss messages; digit fold for Iranian keyboards; UI/RTL N/A
- Docs updated: STATUS → completed; ADR-050 criteria checked; plan completion notes
- Next: ADR-049 Inventory Synchronization Strategy

### 2026-08-03 — ADR-008 Catalog and Inventory Domain — completed

- Plan: `docs/execution/plans/ADR-008.md`
- Changes: `src/catalog-domain` + `src/inventory-domain` contracts; `src/modules/catalog` Product/Category (Persian names, merchant-unique barcode/SKU, IRR Money), ProductCreated/Deleted, create/soft-delete use cases, in-memory repos; `src/modules/inventory` store-scoped StockItem (ADR-091), StockAdjusted, adjustStock (no negative), in-memory repo; `formatTomanDisplay` on shared Money; Drizzle stubs `categories`/`products`/`stock_items`; drizzle-orm-strategy test updated
- Validations: `npm run validate` green (264 tests)
- Iranian First: fa product/category names + Persian shop-floor errors; تومان display via shared money helpers; UI/RTL N/A
- Docs updated: STATUS → completed; ADR-008 criteria checked; plan completion notes; ARD-005/006 remain todo (API/migrations/UI)
- Next: ADR-050 Search and Barcode Scanning Strategy

### 2026-08-03 — ADR-077 API Protection and Data Protection — completed

- Plan: `docs/execution/plans/ADR-077.md`
- Changes: `src/api-protection` — Zod boundary validation stance, AuthZ/rate-limit composition pointers, CORS allowlist (no wildcard), public storefront DTO ACL (forbid cost/PII/OTP/tokens/soft-delete metadata), Iranian phone mask/hash helpers, soft-delete API defaults, CSRF/Server Actions + SameSite stance, encryption-at-rest infra deferral, Idempotency-Key referenced from ADR-030; synced security-architecture / api-standards + 06-security / 15-api / api-rules / security-rules; ARD-010/020 notes
- Validations: `npm run validate` green (254 tests)
- Iranian First: Persian protection/validation/CORS messages; phone PII mask/hash (`09…`/`+98`); UI/RTL N/A
- Docs updated: STATUS → completed; ADR-077 criteria checked; plan completion notes
- Next: ADR-008 Catalog and Inventory Domain (Phase C start)

### 2026-08-03 — ADR-055 Rate Limiting Strategy — completed

- Plan: `docs/execution/plans/ADR-055.md`
- Changes: `src/rate-limiting` — PRD §11.4 policies (OTP 3/min + auth 5/min fixed-window fail-closed; default 10 rps + admin 20 rps + public storefront sliding fail-open), thin `RateLimitRedisPort`, in-memory store for tests, `RateLimiter`/`createRateLimitedEnvelope` Persian 429, `RateLimitTriggered` event factory; synced merchant-auth / api-standards / redis-architecture / security-architecture + redis.md + 06-security-architecture.md
- Validations: `npm run validate` green (244 tests)
- Iranian First: Persian OTP/auth/generic 429 messages; OTP fail-closed for Iranian SMS abuse; UI/RTL N/A
- Docs updated: STATUS → completed; ADR-055 criteria checked; plan completion notes; ARD-002 route wiring remains
- Next: ADR-077 API Protection and Data Protection

### 2026-08-03 — ADR-076 Security Architecture — completed

- Plan: `docs/execution/plans/ADR-076.md`
- Changes: `src/security-architecture` contract — defense-in-depth decision, threat→control map (incl. Iranian SMS OTP abuse), authn/authz + tenant isolation + secrets pillars, OTP/token log hygiene + `assertSafeAuthLogPayload`, HTTPS/secure cookie asserts (ADR-033), security headers checklist, Persian `SECURITY_USER_MESSAGES_FA`, Security DoD for ARDs; docs/architecture/06-security-architecture.md ADR pointer
- Validations: `npm run validate` green (234 tests)
- Iranian First: Persian security warnings; OTP never logged; Iranian phone OTP abuse threat modeled; UI/RTL N/A (no screens)
- Docs updated: STATUS → completed; ADR-076 criteria checked; plan completion notes; ARD-020 pen smoke remains M6
- Next: ADR-055 Rate Limiting Strategy

### 2026-08-03 — ADR-006 Store Domain — Location Branding Slug — completed

- Plan: `docs/execution/plans/ADR-006.md`
- Changes: `src/store-domain` contract — global slug → `/s/{slug}` via `buildStorefrontPath`, structured address + lat/lng, static map + navigate policy (ADR-091), cache TTL notes; `src/modules/store` aggregate (merchantId, slug, branding, hours, address/geo, status, qrAssetRef stub), events StoreCreated/Updated, create/updateBranding/updateHours use cases, Persian `StoreDomainError`, in-memory repo; Drizzle schema stub `stores` (ADR-043/048); schema index + drizzle-orm-strategy test updated
- Validations: `npm run validate` green (225 tests)
- Iranian First: Persian store errors + UTF-8 fa address fields; UI/RTL N/A (no screens); Iranian weekly hours default
- Docs updated: STATUS → completed; ADR-006 criteria checked; plan completion notes; ARD-004 domain foundations noted (ARD remains todo)
- Next: ADR-076 Security Architecture

### 2026-08-03 — ADR-005 Merchant Domain — completed

- Plan: `docs/execution/plans/ADR-005.md`
- Changes: `src/merchant-domain` contract — lifecycle draft→active→suspended, multi-store MVP (ADR-091), activation gates POS/storefront, profile cache TTL note; `src/modules/merchant` aggregate (Persian trade name, slug, contact phone, settings stub), events MerchantCreated/Activated/Updated, create/activate/updateSettings use cases, Persian `MerchantDomainError`, in-memory repo; Drizzle schema stub `merchants` + `merchant_settings` (ADR-043); schema index export; drizzle-orm-strategy test updated for domain tables
- Validations: `npm run validate` green (217 tests)
- Iranian First: Persian merchant errors + Iranian contact phone; UI/RTL N/A (no screens); multi-store enabled
- Docs updated: STATUS → completed; ADR-005 criteria checked; plan completion notes; ARD-003 domain foundations noted (ARD remains todo)
- Next: ADR-006 Store Domain — Location Branding Slug

### 2026-08-03 — ADR-034 Authorization RBAC Model — completed

- Plan: `docs/execution/plans/ADR-034.md`
- Changes: `src/rbac` contract — canonical roles (`merchant_owner`/`store_employee`/`customer`/`platform_admin`), Iranian staff aliases (`owner`/`manager`/`cashier`/`staff`), permission matrix, tenant+store scope `authorize`, Persian `AuthorizationError` deny messages, `authz.deny` metric labels; identity application helpers (`authContextFromJwtClaims` / `authorizeFromJwtClaims` / `assertStaffPermissionFromJwt`); security + multi-tenant docs synced
- Validations: `npm run validate` green (207 tests)
- Iranian First: Persian AuthZ deny messages; UI/RTL N/A (no screens); retail owner vs staff role mapping
- Docs updated: STATUS → completed; ADR-034 criteria checked; plan completion notes
- Next: ADR-005 Merchant Domain

### 2026-08-03 — ADR-033 NextAuth JWT Strategy — completed

- Plan: `docs/execution/plans/ADR-033.md`
- Changes: `src/nextauth-jwt` contract — JWT strategy, no DB session store, claims `sub`/`merchantId`/`roles`/`tokenVersion`, short TTL, secure cookies, AUTH_SECRET binding; `src/modules/identity/infrastructure/auth` Auth.js v5 Credentials/OTP bridge (`createMerchantAuthConfig` / `createMerchantOtpAuthorize`); dep `next-auth@5` beta; merchant-auth sessionImplementation → realized; ARD-002 Wire NextAuth JWT checked
- Validations: `npm run validate` green (194 tests)
- Iranian First: secure HTTPS cookies for Iranian mobile; Persian session/expiry + RTL login noted for UI ADRs (uiuxpromax N/A — no pages)
- Docs updated: STATUS → completed; ADR-033 criteria checked; plan completion notes
- Next: ADR-034 Authorization RBAC Model

### 2026-08-03 — ADR-031 Merchant Authentication Architecture — completed

- Plan: `docs/execution/plans/ADR-031.md`
- Changes: `src/merchant-auth` contract — OTP-first / no-password MVP, AUTH-* notes, OTP 3/min + auth 5/min rate-limit notes (ADR-055 enforce), env OTP disclosure, JWT→ADR-033, SMS→ADR-083 via SmsPort; `src/modules/identity` domain/application (Iranian phone, OtpChallenge, AuthUser ports, request/verify use cases, Persian `MerchantAuthError`, MerchantLoggedIn); infrastructure Console/Mock SMS + in-memory repos; shared `normalizeIranianMobile` + PhoneNumber VO upgrade
- Validations: `npm run validate` green (182 tests)
- Iranian First: Persian OTP/errors/SMS template; `09`/`+98` normalization; RTL login UI noted for later (uiuxpromax N/A — no pages)
- Docs updated: STATUS → completed; ADR-031 criteria checked; plan completion notes
- Next: ADR-033 NextAuth JWT Strategy

### 2026-08-03 — ADR-078 Testing Strategy — completed

- Plan: `docs/execution/plans/ADR-078.md`
- Changes: `src/testing-strategy` contract — unit/integration/e2e pyramid, Vitest unit runner, tenant isolation mandatory when data touched, AuthZ when auth touched, Persian string / تومان / Jalali regression notes + fa fixtures, POS CompleteSale must-cover (no delivery e2e), CI `validate` gate; synced `docs/testing/strategy.md`, `docs/testing/test-pyramid.md`, `docs/rules/testing-rules.md`; package.json `validate` remains
- Validations: `npm run validate` green (170 tests)
- Iranian First: Persian string regression policy + fa fixtures; RTL/تومان/Jalali format tests required when UX helpers in scope; UI shells N/A this ADR
- Docs updated: STATUS → completed; ADR-078 criteria checked
- Next: ADR-031 Merchant Authentication

### 2026-08-03 — ADR-030 API Architecture and Standards — completed

- Plan: `docs/execution/plans/ADR-030.md`
- Changes: `src/api-standards` contract — `/api/v1` versioning, Route Handler + Zod-at-boundary stance, error envelope with `correlationId` + Persian messages / code→fa map, Idempotency-Key for sale/order, camelCase wire vs snake_case DB, auth header expectations + AuthZ in application, never OTP in prod; synced `docs/rules/api-rules.md` + `docs/architecture/15-api-architecture.md`
- Validations: `npm run validate` green (161 tests)
- Iranian First: Persian API human messages + fallback; UI/RTL/تومان/Jalali N/A
- Docs updated: STATUS → completed; ADR-030 criteria checked
- Next: ADR-078 Testing Strategy

### 2026-08-03 — ADR-068 Environment and Secret Management — completed

- Plan: `docs/execution/plans/ADR-068.md`
- Changes: `src/env-secrets` contract — required boot keys (`NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`), `.env.example` only / never commit secrets, separate `AUTH_SECRET`, prod fail-fast + placeholder rejection, Persian config-fail edge messages, zod-free `parseEnv`; enhanced `.env.example`; `docs/deployment/environments.md` synced; ARD-001 env schema checkbox
- Validations: `npm run validate` green (153 tests)
- Iranian First: Persian edge config-fail copy; UI/RTL/تومان/Jalali N/A
- Docs updated: STATUS → completed; ADR-068 criteria checked
- Next: ADR-030 API Architecture and Standards

### 2026-08-03 — ADR-051 Redis Architecture — completed

- Plan: `docs/execution/plans/ADR-051.md`
- Changes: `src/redis-architecture` contract — shared Redis for cache-aside + rate-limit, never SoT, `REDIS_URL` connection, high-level key namespace defer ADR-053, fail-open cache / fail-closed auth-OTP notes defer ADR-055, Unicode/Persian value safety; thin `src/infrastructure/redis/client.ts` stub; unit tests verify compose redis service + REDIS_URL wiring; `docs/tech/redis.md` folder conventions synced
- Validations: `npm run validate` green (145 tests)
- Iranian First: UX N/A; UTF-8 Persian cached values must not be corrupted; OTP abuse plane reserved for ADR-055
- Docs updated: STATUS → completed; ADR-051 criteria checked
- Next: ADR-068 Environment and Secret Management

### 2026-08-03 — ADR-048 Multi-Tenant Data Isolation — completed

- Plan: `docs/execution/plans/ADR-048.md`
- Changes: `src/multi-tenant-isolation` contract — shared DB/schema row-level `merchant_id` mandatory on tenant rows; store-scoped membership/inventory via `store_id` under merchant (ADR-091); repo filters from trusted auth/JWT; deny cross-tenant reads/updates by ID alone; platform_admin exception audited-only; tenant-scoped uniques + cache/EMQX/analytics merchantId notes; PostgreSQL RLS deferred optional (not MVP); `assertTenantMatch` + assert helpers; unit tests; schema/modeling/query/postgresql pointers updated
- Validations: `npm run validate` green (138 tests)
- Iranian First: UX N/A; store-first Iranian multi-store isolation for membership/inventory encoded
- Docs updated: STATUS → completed; ADR-048 criteria checked
- Next: ADR-051 Redis Architecture

### 2026-08-03 — ADR-047 Data Integrity Soft Delete and Audit Fields — completed

- Plan: `docs/execution/plans/ADR-047.md`
- Changes: `src/data-integrity` contract — soft-delete `deleted_at` (required for customer-visible/auditable/membership), mandatory UTC `created_at`/`updated_at`, optional `created_by`, optimistic `version`, partial uniques `WHERE deleted_at IS NULL`, forbid hard-delete of auditable data/`store_memberships` without retention policy, AuditPort insert-only shape deferred to Mongo `mos_audit` (ADR-058), Persian UTF-8 preservation in soft-deleted rows + audit summaries; assert helpers + unit tests; schema/modeling/query/migration pointers updated
- Validations: `npm run validate` green (129 tests)
- Iranian First: UX N/A; audit/soft-delete must preserve `fa` UTF-8 content; no ASCII scrub of audit payloads; timestamps UTC store / Tehran display unchanged
- Docs updated: STATUS → completed; ADR-047 criteria checked
- Next: ADR-048 Multi-Tenant Data Isolation

### 2026-08-03 — ADR-046 Migration Strategy Drizzle Kit — completed

- Plan: `docs/execution/plans/ADR-046.md`
- Changes: `src/migration-strategy` contract — drizzle-kit-only versioned SQL under `src/infrastructure/database/migrations/`, forward-only prod, expand/contract, migrate job before traffic, CI staging apply, lock-aware review, no hand-authored baseline outside kit, Persian UTF-8 data safety; migrations folder + README; solidified `drizzle.config.ts` + `db:generate`/`db:migrate`; assert helpers + unit tests; schema/ADR-042/045 pointers updated
- Validations: `npm run validate` green (120 tests)
- Iranian First: UX N/A; never lose Persian UTF-8 data; no ASCII-only collations; money/Jalali unchanged (storage contract)
- Docs updated: STATUS → completed; ADR-046 criteria checked
- Next: ADR-047 Data Integrity Soft Delete and Audit Fields

### 2026-08-03 — ADR-045 Query Design Standards — completed

- Plan: `docs/execution/plans/ADR-045.md`
- Changes: `src/query-design-standards` contract — always filter `merchant_id` (JWT claim match), keyset pagination (no deep OFFSET), projections / no `SELECT *`, avoid N+1 (batch/join/inArray), repositories only for OLTP, soft-delete default exclude, application composition not cross-module domain joins, read vs write paths + CompleteSale single TX, no unbounded request aggregates + Redis-before-PG preference, UTC store / Tehran display note; assert helpers + unit tests; schema comment points at ADR-045 (still empty)
- Validations: `npm run validate` green (112 tests)
- Iranian First: UX N/A; timestamps UTC storage / Asia/Tehran display; UTF-8 fa search considerations; barcode/fuzzy → ADR-050
- Docs updated: STATUS → completed; ADR-045 criteria checked
- Next: ADR-046 Migration Strategy Drizzle Kit

### 2026-08-03 — ADR-044 Indexing Standards — completed

- Plan: `docs/execution/plans/ADR-044.md`
- Changes: `src/indexing-standards` contract — explicit indexes (not ORM defaults), `merchant_id` leftmost tenant composites, FK indexes when joined, tenant-scoped unique business keys with soft-delete partials, covering only when justified, no redundant left-prefix indexes, Persian UTF-8 / fa search considerations + barcode/fuzzy deferred ADR-050; assert helpers + unit tests; schema index comment points at ADR-044 (still empty)
- Validations: `npm run validate` green (101 tests)
- Iranian First: UX N/A; UTF-8 fa text index considerations; no ASCII-only collations; search detail → ADR-050
- Docs updated: STATUS → completed; ADR-044 criteria checked
- Next: ADR-045 Query Design Standards

### 2026-08-03 — ADR-043 Database Modeling Standards — completed

- Plan: `docs/execution/plans/ADR-043.md`
- Changes: `src/database-modeling` contract — snake_case plural tables, UUID PKs, UTC `timestamptz` audit columns, optional soft-delete `deleted_at`, `merchant_id` on tenant tables, Persian UTF-8 text/varchar, IRR money as integer minor units, optimistic `version`, no cross-module domain joins (ADR-004); assert helpers + unit tests; schema index comment points at ADR-043 (still empty)
- Validations: `npm run validate` green (93 tests)
- Iranian First: UX N/A; UTF-8 fa text columns; money integer IRR minor units (تومان display stays presentation)
- Docs updated: STATUS → completed; ADR-043 criteria checked
- Next: ADR-044 Indexing Standards

### 2026-08-03 — ADR-042 Drizzle ORM Exclusive Strategy — completed

- Plan: `docs/execution/plans/ADR-042.md`
- Changes: deps `drizzle-orm` + `postgres` + `drizzle-kit`; `drizzle.config.ts` on `DATABASE_URL`; `src/infrastructure/database` client stub + empty schema; `src/drizzle-orm-strategy` exclusive-ORM contract (forbidden Prisma/TypeORM/Sequelize/MikroORM/Objection; domain never imports drizzle; migrate detail ADR-046); `db:generate` / `db:migrate` scripts; unit tests
- Validations: `npm run validate` green (83 tests)
- Iranian First: UX N/A; UTF-8 Persian text columns noted as `text`/`varchar` in strategy + schema stub
- Docs updated: STATUS → completed; ADR-042 criteria checked
- Next: ADR-043 Database Modeling Standards

### 2026-08-03 — ADR-041 PostgreSQL Architecture — completed

- Plan: `docs/execution/plans/ADR-041.md`
- Changes: `src/postgresql-architecture` contract — PG sole OLTP SoT, Mongo never OLTP, UUID/timestamptz/soft-delete expectations, merchant_id isolation, UTF-8 Persian text, DATABASE_URL connection via compose/.env.example; assert helpers + unit/compose tests
- Validations: `npm run validate` green (76 tests)
- Iranian First: UX N/A; UTF-8 fa text columns; UTC `timestamptz` storage; Asia/Tehran display deferred to presentation
- Docs updated: STATUS → completed; ADR-041 criteria checked
- Next: ADR-042 Drizzle ORM Exclusive Strategy

### 2026-08-03 — ADR-066 Docker and Compose Local Parity — completed

- Plan: `docs/execution/plans/ADR-066.md`
- Changes: `docker-compose.yml` (app profile + postgres/redis/emqx/minio/mongo, healthchecks, named volumes, UTF-8 PG); `.env.example`; `src/docker-compose-parity` contract (services/ports/planes, Mongo never OLTP SoT, Persian UTF-8 Postgres) + unit/parse tests
- Validations: `npm run validate` green (69 tests)
- Iranian First: UX N/A; Postgres `--encoding=UTF8 --locale=C.UTF-8` for fa text; Mongo analytics-only
- Docs updated: STATUS → completed; ADR-066 criteria checked; ARD-001 compose checkbox
- Next: ADR-041 PostgreSQL Architecture

### 2026-08-03 — ADR-029 Backend Clean Architecture Layering — completed

- Plan: `docs/execution/plans/ADR-029.md`
- Changes: `src/backend-layering` contract (presentation→application→domain←infra, AuthZ/TX/analytics ports, correlationId request boundary, Persian presentation messages); thin `src/shared/application` composition slot; asserts + unit tests
- Validations: `npm run validate` green (62 tests)
- Iranian First: UX N/A; presentation human messages Persian, domain English per contract
- Docs updated: STATUS → completed; ADR-029 criteria checked
- Next: ADR-066 Docker Compose

### 2026-08-03 — ADR-016 Next.js Application Architecture — completed

- Plan: `docs/execution/plans/ADR-016.md`
- Changes: Next.js 15 App Router scaffold (`app/layout.tsx` fa+rtl, Persian home); `src/nextjs-architecture` contract; `dev`/`build`/`start` scripts; dual tsconfig (contracts vs Next)
- Validations: `npm run validate` green (54 tests); `npm run build` green
- Iranian First: root shell `lang=fa` `dir=rtl`; Persian metadata/title; checklist shell items passed / other UI N/A
- Docs updated: STATUS → completed; ADR-016 criteria checked
- Next: ADR-017 App Router Structure

### 2026-08-03 — ADR-091 MVP Product Policies — completed

- Plan: `docs/execution/plans/ADR-091.md`
- Changes: `src/mvp-policies` — multi-store, loyalty expiry, consent, tender, pickup timers, path URL, static map, vendor ports, free Kerman pilot, offline reject-and-review
- Validations: `npm run validate` green (48 tests)
- Iranian First: Persian tender/pilot/consent keys; POS cash/card-terminal workflows
- Docs updated: STATUS → completed; ADR-091 criteria checked
- Next: ADR-016 Next.js Application Architecture

### 2026-08-03 — ADR-085 ADR/ARD Governance — completed

- Plan: `docs/execution/plans/ADR-085.md`
- Changes: `src/governance` — ADR SoT, ARD packages, Proposed=ports/mocks, Iranian First completion gate, filesystem asserts for roadmap/STATUS/skill
- Validations: `npm run validate` green (38 tests)
- Iranian First: mandated as completion gate in contract; UI N/A
- Docs updated: STATUS → completed; ADR-085 criteria checked
- Next: ADR-091 MVP Product Policies

### 2026-08-03 — ADR-004 Modular Monolith Strategy — completed

- Plan: `docs/execution/plans/ADR-004.md`
- Changes: `src/modular-monolith` contract — single Next.js deployable, module registry, no cross-module domain joins, outbox spine, shared security + Persian/RTL shell slots, extraction order
- Validations: `npm run validate` green (33 tests)
- Iranian First: UI N/A; `APP_SHELL_LOCALIZATION` locks fa-IR + RTL + تومان for all modules
- Docs updated: STATUS → completed; ADR-004 criteria checked
- Next: ADR-085 ADR/ARD Governance

### 2026-08-03 — ADR-003 Bounded Context Design — completed

- Plan: `docs/execution/plans/ADR-003.md`
- Changes: `src/bounded-contexts` context map + integrations + storefront/admin ACL; Ordering pickup-only policy; analytics OLTP vs Mongo planes; scaffolded `customer-identity` module; synced ADR-002 module list
- Validations: `npm run validate` green (27 tests)
- Iranian First: UI N/A; pickup Ordering context; no delivery context; membership/customer identity split for Iranian phone OTP audiences
- Docs updated: STATUS → completed; ADR-003 criteria checked
- Next: ADR-004 Modular Monolith Strategy

### 2026-08-03 — ADR-002 Domain-Driven Design Strategy — completed

- Plan: `docs/execution/plans/ADR-002.md`
- Changes: `src/shared/ddd` layering/event/repository contract; `Money`/`PhoneNumber` VOs; scaffolded 16 `src/modules/*/{domain,application,infrastructure}` shells
- Validations: `npm run validate` green (20 tests)
- Iranian First: UI N/A; تومان via `toToman` + ADR-001 display default; phone VO stub for Iranian membership identity
- Docs updated: STATUS → completed; ADR-002 criteria checked
- Next: ADR-003 Bounded Context Design

### 2026-08-03 — ADR-015 MVP Scope Guardrails — completed

- Plan: `docs/execution/plans/ADR-015.md`
- Changes: `src/scope-guardrails` with `MVP_NON_GOALS` / `MVP_IN_SCOPE_PRIORITIES` / `assertWithinMvpScope`; synced ADR-001 `FORBIDDEN_CAPABILITIES` with PRD §3 (`desktop_offline_suite`, `multi_warehouse_erp`, `advanced_ai_recommendations`)
- Validations: `npm run validate` green (12 tests)
- Iranian First: UI N/A; in-scope priorities protect SMS/pickup/POS/QR over delivery/marketplace
- Docs updated: STATUS → completed; ADR-015 criteria checked
- Next: ADR-002 Domain-Driven Design Strategy

### 2026-08-03 — ADR-001 Product Architecture — completed

- Plan: `docs/execution/plans/ADR-001.md`
- Changes: Encoded store-first / pickup-only / dual-plane / Iranian locale defaults as importable contract in `src/product-architecture`; minimal TS package (strict tsc, ESLint, Vitest); `assertPickupOnlyFulfillment` / `assertCapabilityAllowed` / `buildStorefrontPath`
- Validations: `npm run validate` green (typecheck, lint 0 warnings, 8 unit tests)
- Iranian First: locale defaults locked (`fa-IR`, RTL, Jalali, Asia/Tehran, تومان display); UI checklist items N/A (no UX surface in this ADR)
- Docs updated: `adrs/STATUS.md` → completed; ADR-001 completion criteria checked; README status
- Next: ADR-015 Scope Guardrails (roadmap order)

### 2026-08-03 — ADR-091 MVP product policies — completed (docs)

- Human workshop resolved PRD §19 + related policy gaps (multi-store MVP, loyalty expiry, consent UX, POS tender, pickup timers, path URL, static map+nav, free Kerman pilot, SMS/PSP remain Proposed)
- Added `adrs/ADR-091-mvp-product-policy-resolutions.md`; updated PRD v1.2, product/architecture docs, related ADRs, roadmap, STATUS
- No application code written
- Next: run ard-to-code from ADR-001 (honor ADR-091 when modeling domains)

### 2026-08-03 — System bootstrap — completed (docs only)

- Created autonomous AI development environment (docs, ARDs, skills, rules, AGENT.md)
- No application code written
- Next: run ard-to-code starting at ARD-001

### 2026-08-03 — ADR engineering system — completed (docs only)

- Created `/adrs` with ADR-001..090 covering product→ops blueprint
- Added adr-roadmap.md + adr-dependency-map.md
- Rewrote ard-to-code as ADR-driven; updated AGENT.md ADR governance
- Mapped legacy docs/decisions/* into canonical /adrs
- No application code written
- Next: run ard-to-code from ADR-001 per roadmap

