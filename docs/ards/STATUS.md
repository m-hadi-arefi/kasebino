# ARD Status Board

Last updated: 2026-08-03

> **Staff audit + ADR-120:** This board is the **delivery SoT**. Architecture contracts may live in `adrs/done/` while ARDs stay `todo`. See [`../../AUDIT_REPORT.md`](../../AUDIT_REPORT.md) and ADR folders `adrs/done|future|tasks/`. **ADR `complete` ≠ ARD `completed` ≠ production-ready.** Product-runtime complete needs API + migration + tests evidence.

| ID | Title | Status | Completed at |
| --- | --- | --- | --- |
| ARD-001 | Project Foundation | todo | ADR-035 outbox + ADR-052–054 cache + ADR-040 MinIO + ADR-038 EMQX publish (`src/emqx-realtime`) + ADR-039 realtime client (`src/realtime-client`) + ADR-017 App Router groups + ADR-018 component layers + ADR-019 shadcn contract/`components.json` + ADR-020 Tailwind tokens/globals + ADR-021 uiuxpromax gate (`src/uiuxpromax-gate`) + ADR-025 state ownership (`src/state-management`) + ADR-026 data fetching (`src/data-fetching` + TanStack Query) + ADR-027 forms (`src/forms-validation` + Zod/RHF) + ADR-028 error UX (`src/frontend-error-ux`) + ADR-067 `/api/health` liveness + **ADR-092 Kit baseline migration** (`0000_*.sql` + identity tables + `db:check`); Drizzle repos / Redis+MinIO+EMQX protocol adapters / `/api/ready` remain |
| ARD-002 | Authentication (Merchant) | todo | ADR-055 rate-limit package ready; route middleware + Redis wiring remain |
| ARD-003 | Merchant Management | todo | — |
| ARD-004 | Store Management | todo | ADR-006 domain foundations landed; API/migration/UI remain |
| ARD-005 | Product Catalog | todo | ADR-008 domain + ADR-050 lookup/search foundations; API/migration/UI remain |
| ARD-006 | Inventory | todo | ADR-008 domain + ADR-049 sync hooks landed; API/migration/UI remain |
| ARD-007 | POS | todo | ADR-009 domain + ADR-040 MinIO ReceiptRef/port + ADR-025 Zustand cart path + ADR-026 TanStack Query server lists + ADR-027 phone/تومان Zod capacity + ADR-028 barcode-miss recovery / Persian error toast capacity; API/migrations/UI/receipt PDF wiring remain |
| ARD-008 | Customer CRM | in_progress | ADR-098 merchant CRM UI + membership profile/history/segments wired; soft-delete exclusion; full ARD AC still open |
| ARD-009 | Loyalty | todo | ADR-010 domain ready; ADR-035 expiry job hook stub; API/migration/UI remain |
| ARD-010 | Storefront Experience | todo | ADR-017 `/s/[storeSlug]` scaffold + ADR-077 public DTO ACL + ADR-086 architecture (`src/storefront-architecture`) + catalog/about Persian stubs; route handlers / live catalog remain |
| ARD-011 | Orders | in_progress | Domain + HTTP lifecycle APIs; ADR-101 merchant `/orders` pickup board (poll); auto timer jobs ADR-109 remain |
| ARD-012 | Payments | in_progress | ADR-102 HTTP: intents / webhooks / refunds / sandbox confirm (env-gated); OrderPaid via verified path; تومان DTO + storefront simulate UX; real Iranian PSP still ADR-084 Proposed |
| ARD-013 | Dashboard | todo | ADR-017 shell + ADR-088 `src/merchant-dashboard` Persian AN overview stubs (TTL 60s / OLTP wire); live overview API load / Lighthouse / CRM-04 remain |
| ARD-014 | Notifications | todo | ADR-090 module + architecture + outbox consumer + SMS ports + Persian templates; HTTP list/read + Kit migrations + center UI remain |
| ARD-015 | Realtime Layer | todo | ADR-038 `src/emqx-realtime` publisher + ADR-039 `src/realtime-client` (token HTTP + MQTT/poll); compose e2e + live boards remain |
| ARD-016 | Analytics (Merchant OLTP Dashboards) | todo | ADR-014 plane + ADR-063 `src/merchant-oltp-analytics` + ADR-088 dashboard UI stubs (`src/merchant-dashboard`); Drizzle Kit migrations / HTTP APIs / Redis live / live charts remain |
| ARD-017 | PWA (Merchant Staff) | in_progress | ADR-022 + ADR-024 (`src/staff-pwa` + `src/pos-offline` + SW/IDB model/sync contract); browser IDB e2e + HTTP sync route remain |
| ARD-018 | Admin Panel | todo | ADR-017 `(admin)/admin` shell + ADR-013 `src/modules/admin` + `src/admin-domain` + ADR-089 `src/admin-dashboard` Persian RTL stubs (merchants/enforcement/mgmt/security/audit, platform_admin + audited); HTTP `/api/v1/admin/merchants*` + Kit migrations + RBAC route wiring remain |
| ARD-019 | Infrastructure | todo | ADR-067 Prod Dockerfile + ADR-069 CI quality gates (`.github/workflows/ci.yml` + `src/cicd-strategy`) + **ADR-071** NFR-02 `src/scalability-stateless` (stateless JWT multi-instance); runbooks / worker defs / CD deploy scaffolding remain (ADR-070) |
| ARD-020 | Production Hardening | todo | ADR-076 baseline + ADR-077 API protection contracts landed; pen smoke / CORS+headers runtime / full DoD remain M6 |
| ARD-021 | Analytics Platform | todo | ADR-014 plane + ADR-056 mongo plane + ADR-065 ingest failure isolation + ADR-057 event warehouse + ADR-058 audit + ADR-059 product analytics + ADR-060 clickstream + ADR-061 sessions (`src/session-analytics` → mos_sessions) + ADR-062 mgmt dashboards (`src/mgmt-dashboard-analytics` → mos_mgmt) + ADR-064 retention (`src/data-retention` TTL matrix/legal hold) + ADR-089 admin portfolio stubs (`src/admin-dashboard`) + ADR-036 envelope/off-critical-path; live Mongo driver / indexes / admin browse APIs remain |
| ARD-022 | Audit Logging System | todo | ADR-058 `src/audit-logging` (AuditPort → mos_audit + phone scrub + Persian labels); ADR-064 TTL stance (`src/data-retention`); ADR-089 audit browser stub under `/admin/audit`; admin API + live driver/TTL job remain |
| ARD-023 | Product Analytics | todo | ADR-059 `src/product-analytics` (trackEvent → mos_product + funnels POS/QR/pickup/loyalty + feature registry + Persian metric names); HTTP track + admin UI + live driver remain |
| ARD-024 | Event Warehouse | todo | ADR-035 outbox + ADR-037 catalog + ADR-057 `src/event-warehouse` (mos_events mirror + lag); ADR-064 TTL stance (`src/data-retention`); admin browse API/UI + live driver/TTL remain |
| ARD-025 | Management Dashboards | todo | ADR-062 `src/mgmt-dashboard-analytics` (mos_mgmt rollups + platform_admin + DAM/MAM/GMV instrument notes + Persian titles) + ADR-089 portfolio stubs in `src/admin-dashboard`; HTTP APIs / live rollup jobs remain |
| ARD-026 | Security Monitoring | todo | ADR-013 admin enforcement hook stubs (`SecurityMonitoringPort`) + ADR-089 `/admin/security` Persian stub; signal store / EMQX topics / API remain |
| ARD-027 | User Behavior Tracking | todo | ADR-060 `src/clickstream` (beacon batch + trackClickstream → mos_behavior); ADR-061 `src/session-analytics` (sessionId + heartbeat + 30m idle → mos_sessions, duration/device class); ADR-064 TTL 90–180d (`src/data-retention`); HTTP beacon/session + client SDK + live driver remain |
| ARD-028 | Observability & Monitoring | todo | — |
| ARD-029 | Store PWA Platform | in_progress | ADR-023 foundations |
| ARD-030 | Customer Identity Platform | in_progress | ADR-095 JWT + ADR-103 OTP UI (`/s/.../login`) + consent + logout; production SMS still ADR-115 |
| ARD-031 | Customer Membership Domain | todo | ADR-007 domain + schema stub; API/migration/OTP join wiring remain |
| ARD-032 | Store Location & Maps | todo | — |
| ARD-033 | QR Acquisition System | in_progress | ADR-081 foundations (`src/qr-acquisition`); merchant print UI / PNG lib / analytics emit remain |
| ARD-034 | Pickup Order Flow | todo | — |
| ARD-035 | Customer Dashboard | in_progress | ADR-103 live portal me/* + dashboard orders/wallet/rewards/receipts; MinIO receipt download → ADR-111 |

## Status values

- `todo` — not started
- `in_progress` — ard-to-code actively implementing
- `blocked` — dependency or external decision blocked
- `completed` — validation passed + DoD met

Only one ARD should be `in_progress` at a time for a given autonomous agent run.

## Suggested sequencing

**Core OLTP:** 001 → 002 → 003 → 004(+032) → 005 → 006 → 007 → 031 → 008 → 009  

**Customer digital surface:** 010 → 030 → 029 → 033 → 011/012 → 034 → 035  

**Analytics stream:** 021 → 024 → 022/023/027 → 025/026 → 028  

**Staff PWA / harden:** 017 → 018 → 019 → 020  
