# MerchantOS Full Repository Audit Report

> **Superseded for runtime truth:** see [`docs/audit/`](./docs/audit/) (2026-08-09). This file remains as a historical snapshot of the pre-runtime architecture phase.

| Field | Value |
| --- | --- |
| Product | MerchantOS (Kasbino) |
| Audit date | 2026-08-03 |
| Auditor role | Staff Engineer / Solution Architect / Product Owner / Technical Auditor |
| Source of truth | **Repository code** (docs validated against implementation) |
| ADR reorganization | [`adrs/REORGANIZATION_INDEX.md`](./adrs/REORGANIZATION_INDEX.md) |
| ADR “done” meaning | **Contract/domain/tests** (`ard-to-code`) — **not** full MVP runtime (see `adrs/tasks/`) |

---

## Executive Summary

MerchantOS is an **architecture-first modular monolith** with unusually strong decision documentation: 91 ADRs, 35 ARDs, Iranian-First governance, DDD module skeletons, Drizzle schema **stubs**, Compose data-plane parity, and ~98 Vitest **contract** tests. The old `adrs/STATUS.md` claiming most ADRs `completed` is **false for product/runtime completeness**.

**What exists today:** decision contracts under `src/*`, clean-architecture modules with real domain logic against **in-memory** repositories, Persian/RTL **UI shells**, `/api/health`, a partially authorized realtime token route, CI quality gates, and Docker Compose for Postgres/Redis/EMQX/MinIO/Mongo.

**What does not exist:** Drizzle Kit migrations, Drizzle repositories, Auth.js App Router wiring, product `/api/v1` resource APIs, shadcn UI primitives, live Redis/Mongo/EMQX/MinIO protocol clients, outbox workers, POS/CRM/loyalty/storefront/admin end-to-end flows, SMS provider selection, PSP selection, CD/DR/observability.

**Verdict:** Excellent foundation for autonomous ADR-driven construction; **not production-ready** and **not MVP-complete**. Treat prior “ADR completed” marks as *architecture contract landed*, not *feature shipped*.

| Score | Value | Rationale |
| --- | ---: | --- |
| Repository health | **38 / 100** | Strong docs/structure/tests-as-contracts; weak runnable product surface |
| Product completion | **11 / 100** | Shells + domain logic; almost no durable user journeys |
| Architecture quality | **78 / 100** | Clear boundaries, DDD, dual data planes, Iranian-First rules |
| Production readiness | **6 / 100** | No auth sessions, no migrations, stub infra clients, security bypasses |

---

## Phase 1 — Product Feature Matrix

Legend: **Y** = yes, **P** = partial, **N** = no/missing.

| Feature | Defined in PRD | Implemented | Partially | Missing |
| --- | :---: | :---: | :---: | :---: |
| Merchant phone OTP auth (AUTH-01..06) | Y | | P | Runtime JWT routes + prod SMS |
| Customer phone OTP (CUST-01) | Y | | P | Routes/UI/session |
| Store profile + mandatory geo (LOC-01) | Y | | P | API/UI enforcement |
| Store branding / slug / storefront URL | Y | | P | Live branding, activation gates |
| Store QR printable (SF-12) | Y | | P | PNG/print UI |
| POS barcode / search / camera (POS-01..04) | Y | | P | Domain+contracts only; no UI/API |
| POS phone capture → membership (POS-05/06, MEM-*) | Y | | P | In-memory only |
| POS receipt (POS-07) | Y | | P | ReceiptRef; no MinIO PDF |
| Offline POS queue (POS-08 P1) | Y | | P | Contracts; no SW/IDB e2e |
| CRM profiles / history / segments (CRM-*) | Y | | P | No merchant CRM UI/API |
| Loyalty points/rewards/coupons/wallet (LYL-*) | Y | | P | Domain+schema; no runtime earn/expiry job |
| Storefront catalog + PDP (SF-01/02) | Y | | P | Static shells |
| Pickup-only checkout (SF-03, ORD-10..12) | Y | | P | Policy encoded; no live checkout |
| Store about + map/nav (SF-04, LOC-02) | Y | | P | Copy only |
| Store PWA installable (SF-13) | Y | | P | Manifest stubs |
| Customer portal points/history/rewards (CUST-02/03) | Y | | P | Dashboard shells |
| Merchant analytics AN-01..04 | Y | | P | Persian stubs; no live OLTP |
| Admin merchant mgmt ADM-01 | Y | | P | Shell + in-memory admin domain |
| Admin fraud/realtime ADM-02/03 | Y | | P | Stubs/hooks only |
| Payments digital / webhooks | Y | | P | Sandbox domain; no HTTP/PSP |
| Notifications in-app/SMS | Y | | P | Module+mock SMS; no center |
| Redis cache-aside + rate limits | Y | | P | Contracts; memory backends |
| EMQX realtime | Y | | P | Token route; no live mqtt publish |
| Mongo analytics/audit plane | Y | | P | Contracts; no driver |
| Docker Compose local parity | Y | Y | | |
| CI lint/typecheck/test/build | Y | Y | | |
| CD / zero-downtime / DR / OTEL | Y (NFR) | | | N |
| Delivery / courier | Explicit non-goal | | | Correctly absent |
| Accounting / marketplace / AI | Explicit non-goal | | | Correctly absent |

### PRD-defined but not implemented (material gaps)

All P0 journeys: production OTP, POS checkout, CRM, loyalty runtime, live storefront/pickup, customer portal, analytics dashboards, payments HTTP, maps/QR print, durable persistence.

### Partially implemented

Architecture contracts + domain use cases + in-memory persistence + UI shells across nearly every MVP domain.

### Abandoned / undocumented product features

No abandoned game/chat/social systems (those examples in the audit brief do not apply to MerchantOS).  
**Undocumented-as-shipped risk:** many ADRs claim completion while shipping only contracts—governance mismatch, not a hidden feature set.

### Implementation mismatches

1. `adrs/STATUS.md` vs `docs/ards/STATUS.md` vs code (completed vs todo vs stubs).
2. Realtime token trusts `x-merchant-id` header (auth bypass) despite JWT strategy ADRs.
3. Schema stubs present but migrations empty—config implies readiness that isn’t there.
4. `next-auth` dependency present without App Router handlers.

---

## Phase 2 — Architecture Audit

### Structure (actual)

- **Not a multi-app monorepo.** Single Next.js 15 app at repo root (`app/`, `src/`).
- **Module layout:** `src/modules/{identity,merchant,store,catalog,inventory,pos,crm,loyalty,ordering,payments,notifications,admin,analytics,...}` with application/domain/infrastructure layers.
- **ADR contract packages:** dozens of `src/<topic>/index.ts` + `index.test.ts` enforcing decisions.
- **UI:** App Router groups `(marketing)`, `(merchant)`, `(storefront)`, `(admin)`.

### What works architecturally

- Clear bounded contexts and dependency inversion (ports + in-memory adapters).
- OLTP vs Mongo analytics plane separation is consistently encoded.
- Pickup-only / store-first / Iranian-First rules appear in contracts and shells.
- Compose brings up the mandated data plane.

### Violations / risks

| Finding | Severity |
| --- | --- |
| STATUS marks domain ADRs complete without persistence or HTTP | Critical (governance) |
| All production adapters are stubs/in-memory | Critical |
| No package boundary tooling (single package.json)—ok for Phase 1, but easy to blur layers | Medium |
| Duplicated SMS ports across identity/customer-identity/notifications | Medium |
| Empty `src/components/**` vs ADR-018/019 claims | High |
| Scalability/HA ADRs unimplemented while NFR claims cloud-native | High |
| Event catalog lists Campaign* events with no campaign domain | Low (future) |

### Dead / obsolete

- No obsolete domain modules found.
- Empty component gitkeeps are placeholders, not dead features.
- Delivery intentionally out of scope (good).

---

## Phase 3 — Code Audit

### Runtime surface (truth)

| Area | Evidence |
| --- | --- |
| API routes | `app/api/health`, `app/api/v1/realtime/token`, two webmanifest routes |
| Auth | Config factory only; **no** `auth.ts` / route handlers |
| DB | `createDb()` factory + schema stubs; **0** SQL migrations; **0** Drizzle repos |
| Infra clients | Redis/Mongo/EMQX/MinIO = **URL config stubs** (no protocol SDKs) |
| Repositories | **21** `in-memory*` adapters |
| UI | Persian shells (POS, dashboards, storefront, admin)—no interactive workflows |
| Workers | Outbox jobs return `stub_acknowledged` |
| Tests | ~98 Vitest files—overwhelmingly contract/unit, not e2e |
| CI | `.github/workflows/ci.yml` validate + build; no CD |

### Defect / debt themes

- **Stubs everywhere** labeled deferred to ARDs (accurate in ARD board, inaccurate in ADR board).
- **Security:** realtime authorizer header bypass; no route authZ enforcement; no security headers middleware.
- **Hardcoded/dev:** Compose default passwords in `.env.example` (acceptable for local); AUTH_SECRET placeholder.
- **Unhandled production paths:** SMS/PSP Proposed; readiness probe missing.
- **Race/consistency:** cannot evaluate sale/outbox atomicity until Drizzle transactions land—design intends it; not implemented.
- **Missing validation/authZ at HTTP edge:** N/A for missing routes, but composition root not established.

### Production-ready?

| Component | Ready? |
| --- | --- |
| Architecture docs & ADR contracts | Yes (as design) |
| Local Compose data plane | Yes |
| CI compile/test contracts | Yes |
| MVP merchant/customer product | **No** |
| Staging/production deploy | **No** |

---

## Phase 4 — ADR Classification (code truth)

Full move log: [`adrs/REORGANIZATION_INDEX.md`](./adrs/REORGANIZATION_INDEX.md).

| Classification | Count | Dest |
| --- | ---: | --- |
| Fully implemented (**ADR contract DoD**) | 81 | `adrs/done/` |
| Not implemented | 10 | `adrs/future/` |
| Obsolete | 0 | — |
| Superseded | 0 | — |
| **New task ADRs** (runtime/MVP gaps) | **30** | `adrs/tasks/` |

> **Reclassification (same day):** User confirmed done = contracts + domain + tests. 69 ADRs previously parked in `future/` under a stricter runtime bar were moved to `done/`. Product/runtime gaps remain exclusively in `tasks/` + ARD board.

### Fully implemented (done)

ADR-001, 002, 003, 004, 015, 021, 066, 067, 069, 082, 085, 091.

### Not implemented (future)

ADR-070, 071, 072, 073, 074, 075, 079, 080, 083, 084.

### Partially implemented (future)

All remaining ADR-005…090 not listed above (domains, frontend, auth, data, cache, analytics, security testing strategy, dashboards, notifications, etc.).

**Note:** Old STATUS `completed` for partial ADRs meant “contract package merged,” not MVP acceptance. This audit rejects that equivalence.

---

## Phase 5 — Folder Reorganization

```
adrs/
  done/     # 81 fully implemented (ADR contract/domain/tests DoD)
  future/   # 10 not implemented (ops + Proposed vendors)
  tasks/    # 30 audit-generated work ADRs for MVP runtime wiring
  STATUS.md
  README.md
  REORGANIZATION_INDEX.md
```

Filenames preserved. No ADR bodies deleted.

---

## Phase 6 — Missing Work (Task ADRs)

| ID | Title | Complexity |
| --- | --- | --- |
| ADR-092 | Drizzle Kit OLTP migrations | M |
| ADR-093 | Drizzle repositories (replace in-memory) | L |
| ADR-094 | HTTP `/api/v1` MVP surface | XL |
| ADR-095 | NextAuth App Router wiring | L |
| ADR-096 | Merchant POS UI + CompleteSale | XL |
| ADR-097 | Catalog & inventory merchant APIs/UI | L |
| ADR-098 | CRM membership merchant UI | L |
| ADR-099 | Loyalty engine runtime | L |
| ADR-100 | Storefront catalog + pickup checkout | XL |
| ADR-101 | Pickup order merchant board | L |
| ADR-102 | Payments HTTP + PSP path | L |
| ADR-103 | Customer OTP + portal | L |
| ADR-104 | Store maps + QR print | M |
| ADR-105 | Staff/store PWA completion | L |
| ADR-106 | Live merchant/admin dashboards | XL |
| ADR-107 | Notifications center | M |
| ADR-108 | Redis cache + rate-limit runtime | M |
| ADR-109 | Outbox worker + live EMQX | L |
| ADR-110 | Mongo analytics runtime | L |
| ADR-111 | MinIO receipts/assets | M |
| ADR-112 | `/api/ready` readiness probe | S |
| ADR-113 | RBAC route enforcement | M |
| ADR-114 | shadcn UI component library | M |
| ADR-115 | Iranian SMS provider production | M |
| ADR-116 | Observability & alerting runtime | L |
| ADR-117 | E2E + performance testing layers | L |
| ADR-118 | Deploy / backup / DR | XL |
| ADR-119 | Security hardening runtime | M |
| ADR-120 | ADR STATUS truth realignment | S |
| ADR-121 | Merchant onboarding + multi-store setup | L |

---

## Phase 7 — Gap Analysis Detail

### Missing features (complete list)

1. Durable PostgreSQL schema via migrations  
2. Drizzle repository persistence  
3. Merchant OTP HTTP + JWT session  
4. Customer OTP HTTP + JWT session  
5. Production SMS provider  
6. Merchant onboarding / multi-store setup UI  
7. Catalog/inventory management UI + API  
8. POS interactive checkout + receipt storage  
9. CRM UI + segments  
10. Loyalty earn/redeem/expiry worker  
11. Live storefront catalog/PDP  
12. Pickup checkout + payment intents/webhooks  
13. Merchant pickup order board  
14. Customer portal live data  
15. Maps/navigation on store about  
16. QR PNG generation/print  
17. Staff offline sync HTTP + SW  
18. Store customer PWA branding install completion  
19. Merchant analytics live widgets  
20. Admin merchant enforcement APIs  
21. Notifications list/read UI  
22. Redis live cache + OTP rate limits  
23. Outbox worker + MQTT publish  
24. Mongo driver + warehouse/audit ingest  
25. MinIO SDK uploads  
26. `/api/ready`  
27. Security headers + remove identity header bypass  
28. RBAC on all routes  
29. shadcn primitives / domain components  
30. OTEL/metrics/alerts  
31. CD, HA deploy, backups, DR  
32. Playwright e2e + perf budgets  
33. PSP production selection (ADR-084)  
34. Campaign/marketing credits (post-pilot per PRD—track but don’t block MVP)

### Partially implemented features (complete list)

All domains with contracts + in-memory use cases + UI shells: merchant, store, membership, catalog, inventory, POS, loyalty, ordering, payments, admin, notifications, analytics planes, cache/rate-limit packages, realtime token, PWAs manifests, dashboards stubs, API standards, security contracts, testing strategy contracts, env example.

### Missing ADR coverage (before this audit)

Gaps lacked task ADRs for: migration generation, repository wiring, HTTP surface, Auth.js wire-up, POS/CRM/loyalty/storefront UI completion, worker processes, live infra SDKs, readiness probe, STATUS honesty, onboarding wizard. **Addressed by ADR-092…121.**

### Technical debt (prioritized)

| Priority | Debt |
| --- | --- |
| P0 | False ADR completion status / agent confusion |
| P0 | In-memory-only persistence |
| P0 | No product API/auth sessions |
| P0 | Security bypass on realtime token |
| P1 | Stub infra clients without SDK deps |
| P1 | Empty UI component library |
| P1 | Duplicated SMS port implementations |
| P1 | **No OLTP tables for auth users / OTP challenges** in Drizzle schema (identity modules in-memory only) |
| P1 | **ESLint ignores `app/**`**; `npm run typecheck` is `tsconfig.contracts.json` (`src` only) — Next UI unlinted/untypechecked in CI validate |
| P2 | Contract-test-only pyramid (98 files / ~694 vitest cases; no e2e) |
| P2 | No worker/CD topology; `scripts/` empty |
| P2 | Placeholder module shells only: `src/modules/{audit,platform,realtime}` (`.gitkeep` layers; logic lives in sibling `src/*` packages) |
| P3 | Campaign events in catalog without domain; under-integrated deps in `app/` (RHF, TanStack Query, Zustand, next-auth) |
| P3 | Zero inline `TODO`/`FIXME`/`@ts-ignore` — debt is ADR-labeled stubs (harder to grep, easier to miss) |

### Security risks (prioritized)

| Priority | Risk |
| --- | --- |
| Critical | `x-merchant-id` header accepted as session for realtime tokens |
| Critical | No enforced authN/authZ on future open surfaces until ADR-095/113 |
| High | `shouldReturnDevOtp` = `nodeEnv !== "production"` — **staging/test would return OTP in API JSON** once routes land (AUTH-03/04) |
| High | Console SMS adapters can `stdout` full OTP body if composed outside local |
| High | Default Compose credentials if reused in any shared env |
| Medium | No CSP/CORS/security headers runtime |
| Medium | Audit/PII scrubbing only contractual until Mongo runtime |
| Low | Proposed SMS/PSP leave prod identity/payments blocked (availability, not direct exploit) |

### Recommended development roadmap

#### Critical

1. ADR-120 — realign STATUS / DoD  
2. ADR-092 → ADR-093 — migrations + Drizzle repos  
3. ADR-095 → ADR-113 → ADR-119 — auth sessions, RBAC, remove bypasses  
4. ADR-094 — HTTP API spine  
5. ADR-096 + ADR-097 + ADR-098 — POS + catalog + CRM (P0 merchant loop)

#### High

6. ADR-121 onboarding  
7. ADR-099 loyalty runtime  
8. ADR-100 / ADR-101 / ADR-102 / ADR-103 storefront pickup + payments + customer portal  
9. ADR-108 / ADR-109 Redis + outbox/EMQX  
10. ADR-115 SMS provider acceptance  
11. ADR-112 readiness probe  

#### Medium

12. ADR-104 maps/QR  
13. ADR-105 PWA completion  
14. ADR-106 / ADR-107 dashboards + notifications  
15. ADR-110 / ADR-111 Mongo + MinIO  
16. ADR-114 shadcn library  

#### Low

17. ADR-116 / ADR-117 observability + e2e/perf  
18. ADR-118 deploy/DR  
19. ADR-084 PSP production (post-sandbox)  
20. Post-pilot monetization/campaigns per PRD §6  

Suggested ARD sequencing remains useful once STATUS honesty is fixed: foundation persistence → auth → catalog/POS → membership/loyalty → storefront/pickup → analytics/admin → harden.

---

## Phase 8 — Validation Checklist

| Check | Result |
| --- | --- |
| Every PRD MVP domain mapped in feature matrix | Yes |
| Every pre-existing ADR classified | Yes (91/91) |
| ADRs moved to done/future without content loss | Yes (81 done + 10 future) |
| Task ADRs created for missing work | Yes (30) |
| REORGANIZATION_INDEX written | Yes |
| AUDIT_REPORT written | Yes |
| Re-scanned API routes / migrations / in-memory / infra stubs | Yes |
| Old STATUS not trusted | Yes |

### Re-scan counts (post-move)

- `adrs/done`: 81  
- `adrs/future`: 10  
- `adrs/tasks`: 30  
- Root `ADR-*.md`: 0  
- SQL migrations: 0  
- Product API resource routes: 0 (excluding health/token/manifests)  
- In-memory repositories: 21  
- Vitest: ~98 files / ~694 tests (contracts/domain, not e2e)  
- Drizzle OLTP table stubs: 22 (no auth_user/otp_challenge tables)  

### Addendum — parallel explorer validation (same audit day)

Cross-checked by independent explorers: [ADR inventory](06308215-cd5a-42f3-b437-3096ba1b5d42), [monorepo map](ea4e888a-7dad-4bf0-8d80-4b30fad3148c), [module depth](e44d3f88-306d-43b3-b7c8-93a5397a0d5c), [debt scan](5b04b39d-ef98-48ee-819d-49676116cca3). No classification reversals. Incremental findings folded into debt/security tables above; task ADR-092/095/119 requirements tightened accordingly.

---

## Bottom line

Ship a **persistence + auth + HTTP + POS** vertical slice next. Do not start more architecture-contract ADRs. Do not mark runtime ADRs complete until migrations, repositories, routes, and Iranian-First UX acceptance criteria pass on real Compose infrastructure.
