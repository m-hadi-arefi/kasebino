# ADR Roadmap — Execution Order

Canonical decision records live in [`/adrs`](../../adrs/).  
Implementation status: [`/adrs/STATUS.md`](../../adrs/STATUS.md).

This roadmap is the **build order** for ard-to-code. Complete ADRs left-to-right respecting dependencies (see also [adr-dependency-map.md](./adr-dependency-map.md)).

## Legend

| Tag | Meaning |
| --- | --- |
| BLOCKING | Must complete before dependents |
| PARALLEL | Can proceed alongside siblings when deps met |
| PROPOSED | Decision open; implement ports/mocks only |

## Phase A — Foundation (BLOCKING spine)

| Order | ADR | Notes |
| --- | --- | --- |
| 1 | ADR-001 Product Architecture | Store-first spine |
| 2 | ADR-015 Scope Guardrails | Prevent delivery/marketplace creep |
| 3 | ADR-002 DDD | |
| 4 | ADR-003 Bounded Contexts | |
| 5 | ADR-004 Modular Monolith | |
| 6 | ADR-085 ADR/ARD Governance | Process rules live |
| 6b | ADR-091 MVP Product Policies | Multi-store, loyalty expiry, consent, tender, pickup timers, URL, maps, free pilot — binding defaults |
| 7 | ADR-016 Next.js | App shell |
| 8 | ADR-029 Backend Layering | |
| 9 | ADR-066 Docker Compose | Local data plane |
| 10 | ADR-041 PostgreSQL | |
| 11 | ADR-042 Drizzle ORM | |
| 12 | ADR-043–048 Modeling/Indexes/Queries/Migrations/Integrity/Tenancy | PARALLEL after 042 |
| 13 | ADR-051 Redis | |
| 14 | ADR-068 Env/Secrets | |
| 15 | ADR-030 API Standards | |
| 16 | ADR-078 Testing Strategy | |

**Exit:** Greenfield repo boots with Compose, Drizzle, modules, CI lint/type/test smoke.

## Phase B — Identity & Tenancy

| Order | ADR | Notes |
| --- | --- | --- |
| 17 | ADR-031 Merchant Auth | |
| 18 | ADR-033 NextAuth JWT | |
| 19 | ADR-034 RBAC | |
| 20 | ADR-005 Merchant Domain | |
| 21 | ADR-006 Store Domain | |
| 22 | ADR-076 Security + ADR-055 Rate Limit + ADR-077 API Protection | PARALLEL |

**Exit:** Merchant OTP login; tenant guards.

## Phase C — Catalog, POS, Membership

| Order | ADR | Notes |
| --- | --- | --- |
| 23 | ADR-008 Catalog/Inventory | |
| 24 | ADR-050 Search/Barcode | |
| 25 | ADR-049 Inventory Sync | |
| 26 | ADR-007 Membership | |
| 27 | ADR-009 POS/Sales | |
| 28 | ADR-010 Loyalty | |
| 29 | ADR-036–037 Events + catalog governance | |
| 30 | ADR-035 Outbox workers | |
| 31 | ADR-052–054 Cache aside/keys/invalidation | PARALLEL |
| 32 | ADR-040 MinIO | Receipts/media |

**Exit:** POS sale with membership + loyalty + events + cache.

## Phase D — Customer Digital Surface (Store-first)

| Order | ADR | Notes |
| --- | --- | --- |
| 33 | ADR-017–021 Frontend system (router, components, shadcn, tailwind, uiuxpromax) | PARALLEL early with C when needed for UI |
| 34 | ADR-025–028 State, fetching, forms, error UX | |
| 35 | ADR-086 Storefront | |
| 36 | ADR-032 Customer SMS OTP | |
| 37 | ADR-023 Store PWA | |
| 38 | ADR-081 QR Acquisition | |
| 39 | ADR-011 Pickup Orders + ADR-082 Pickup-only | |
| 40 | ADR-012 Payments (sandbox) | ADR-084 PROPOSED vendor |
| 41 | ADR-087 Customer Dashboard | |
| 42 | ADR-022 Staff PWA + ADR-024 Offline P1 | Can PARALLEL with D late |

**Exit:** Store URL/QR/PWA; customer portal; pickup lifecycle.

## Phase E — Realtime & Notifications

| Order | ADR | Notes |
| --- | --- | --- |
| 43 | ADR-038 EMQX | |
| 44 | ADR-039 MQTT client + poll fallback | |
| 45 | ADR-090 Notifications | |

## Phase F — Analytics Plane (Mongo)

| Order | ADR | Notes |
| --- | --- | --- |
| 46 | ADR-014 Analytics boundaries | |
| 47 | ADR-056 Mongo plane | |
| 48 | ADR-065 Failure isolation | Before instrumenting POS heavily |
| 49 | ADR-057 Warehouse | |
| 50 | ADR-058 Audit | |
| 51 | ADR-059–061 Product/behavior/session | PARALLEL |
| 52 | ADR-063 Merchant OLTP dashboards | PARALLEL with F |
| 53 | ADR-062 Mgmt dashboards | |
| 54 | ADR-064 Retention | |
| 55 | ADR-088 Merchant dashboard UI | |
| 56 | ADR-013 Admin domain + ADR-089 Admin UI | |

## Phase G — Production Hardening

| Order | ADR | Notes |
| --- | --- | --- |
| 57 | ADR-067 Containers | |
| 58 | ADR-069 CI/CD | |
| 59 | ADR-070 Zero-downtime deploy | |
| 60 | ADR-071 Scalability | |
| 61 | ADR-072 Data plane topology | |
| 62 | ADR-073 Backup/DR | |
| 63 | ADR-074 Observability | |
| 64 | ADR-075 Monitoring/alerting | |
| 65 | ADR-079 Testing layers deep | Continuous |
| 66 | ADR-080 Error handling | |
| 67 | ADR-083 SMS provider | PROPOSED → Accept before prod OTP |
| 68 | ADR-084 PSP | PROPOSED → Accept before real charges |

## Parallelization summary

```
A foundation ─────────────────────────────┐
B identity ───────────────────────────────┤
C POS core ───────────────┬───────────────┤
D storefront/customer ────┤               ├──► G production
E realtime ───────────────┤               │
F analytics mongo ────────┴───────────────┘
```

## Completion criteria (each ADR)

1. Implementation matches Decision  
2. Tests for impacted paths green  
3. Docs/ARDs aligned  
4. STATUS → `completed`  
5. No open blocker comments without `blocked` status  

## Mapping to ARDs

ADRs define *decisions*; ARDs (docs/ards) define *delivery packages*. When implementing an ADR, update or complete the related ARDs listed in that ADR’s Implementation Requirements.
