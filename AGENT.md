# AGENT.md — MerchantOS Repository Operating Manual

This document is the operating system for humans and AI agents working in this repository.

## Project purpose

Build **MerchantOS** — an **Iranian-native** Customer Retention Operating System for local retail — per [`PRD.md`](./PRD.md).

Retention starts at POS: capture customer phone during checkout, then power CRM, loyalty, analytics, and storefront.

**This repository is an ADR-driven engineering system.** The platform is built by executing the **ard-to-code** skill against unfinished ADRs in **`adrs/tasks/`** until that queue is drained (files moved to `adrs/done/`). Folder layout: [`adrs/done/`](./adrs/done/) (architecture contracts landed) · [`adrs/future/`](./adrs/future/) (not started / Proposed vendor) · [`adrs/tasks/`](./adrs/tasks/) (product-runtime wiring).

**Runtime truth:** [`docs/audit/`](./docs/audit/) (2026-08-09). **Execution order:** [`docs/architecture/adr-execution-order.md`](./docs/architecture/adr-execution-order.md). **Task index:** [`adrs/tasks/INDEX.md`](./adrs/tasks/INDEX.md). Historical snapshot: [`AUDIT_REPORT.md`](./AUDIT_REPORT.md).

## Non-negotiable laws

1. **`/adrs` is the source of truth for architecture decisions.** No implementation without a covering ADR.
2. `PRD.md` (+ store-first evolution) is the product source of truth.
3. ARDs in `docs/ards/` are delivery packages that must map to ADRs.
4. No feature/architecture code outside ard-to-code (or explicit human exception).
5. No architectural change without updating or superseding an ADR.
6. All rules in `docs/rules/` are binding — including **`docs/rules/iranian-first-development.md`**.
7. UI work requires **uiuxpromax** before implementation (ADR-021).
8. Validation is never optional.
9. Modular monolith + DDD + PostgreSQL/**Drizzle** + Redis + EMQX + MinIO + Mongo analytics plane.
10. **Drizzle is the only SQL ORM.** Mongo is never OLTP SoT.
11. **Store-first** + **pickup-only MVP** (no delivery/marketplace browsing).
12. Every production decision must be documented as an ADR.
13. **All development must follow Iranian First UX principles** (Persian, RTL, Jalali, تومان, Iranian workflows).

## Architecture (summary)

- Phase 1: Modular monolith (Next.js App Router + modules)
- **OLTP:** PostgreSQL + **Drizzle ORM**; Redis; EMQX; MinIO
- **Analytics plane:** MongoDB (warehouse/audit/telemetry)
- **Store-first customer surfaces:** dedicated storefront + store PWA + membership + customer OTP
- **Pickup-only** online orders with full pickup lifecycle
- Clean Architecture; multi-tenant `merchantId` + store-scoped membership
- Outbox → EMQX + Mongo warehouse mirror
- **ERPNext (future):** external ERP/accounting engine via `AccountingProvider` + outbox — see ERPNext Architecture Context below

See `docs/architecture/` and `docs/product/store-first-evolution.md`.

## ERPNext Architecture Context

MerchantOS integrates with **ERPNext** as an external ERP/accounting engine (**financial brain**).

MerchantOS owns:

- retail experience (Persian + RTL)
- POS (including offline)
- storefront / store customer PWA
- CRM, loyalty, membership
- orders / pickup
- operational inventory availability
- **native finance UX** that reads books via server ACL (`/finance`) — never Desk iframe

ERPNext owns:

- accounting (CoA, GL, Sales/Purchase Invoice, Payment Entry, A/R–A/P, tax config, financial reports)
- purchasing / suppliers
- inventory **valuation** / COGS books

**Never** move MerchantOS UX into ERPNext Desk/Website.  
**Never** put ERPNext DocTypes/HTTP inside core domains (`pos`, `catalog`, `crm`, …) or the browser.  
Use Outbox → `AccountingProvider` for writes; `src/modules/erpnext` + `/api/v1/erpnext/*` for merchant finance reads.

Knowledge base: [`docs/integrations/erpnext/`](./docs/integrations/erpnext/).  
ADRs: **135–141**. Prep seams: ADR-126…134.

Local financial engine:

```bash
npm run erpnext:up
npm run erpnext:bootstrap   # after Setup Wizard
# MOS_ACCOUNTING_PROVIDER=erpnext + printed secrets in .env
npm run worker:outbox
```

Important rules:

1. **Never** put ERPNext logic inside core domain modules.
2. **Never** import Frappe REST/DocType helpers from domain/application layers of retail modules.
3. **Never** replace MerchantOS POS/UI/storefront with ERPNext Desk or Website.
4. **Never** HTTP to ERP inside CompleteSale/checkout transactions — outbox only.
5. **ERPNext is financial truth**; **MerchantOS is retail experience truth**.
6. Credentials are **server/worker only** — never `NEXT_PUBLIC_*`, browser, POS, or customer app.
7. Default `MOS_ACCOUNTING_PROVIDER=noop` keeps CI green without Docker ERPNext.

## Iranian First UX (permanent)

**All development must follow Iranian First UX principles.**

MerchantOS is built primarily for Iranian merchants and customers. Before implementing **any** feature, every AI agent MUST check:

1. Does this feature need Persian text?
2. Does this feature support RTL?
3. Does this feature support Jalali dates?
4. Does this feature support تومان formatting?
5. Does this feature match Iranian user behavior?
6. Does this feature work well on Iranian mobile devices?

**No feature is considered complete without these checks** and without passing [`docs/checklists/iranian-feature-checklist.md`](./docs/checklists/iranian-feature-checklist.md).

Binding rule: [`docs/rules/iranian-first-development.md`](./docs/rules/iranian-first-development.md).

## Documentation hierarchy

```
PRD.md                          ← product truth
adrs/                           ← architecture decision truth (ADR-001…)
  done/ | future/ | tasks/      ← contract landed | deferred | runtime work queue
AGENT.md                        ← how to operate the repo (this file)
docs/architecture/adr-roadmap.md
docs/architecture/adr-dependency-map.md
docs/architecture/              ← system design explanations
docs/product/                   ← product decomposition
docs/tech/                      ← stack knowledge
docs/ards/                      ← delivery packages (ARDs) + STATUS
docs/rules/                     ← binding engineering law (incl. Iranian First)
docs/checklists/                ← mandatory feature checklists
docs/uiux/                      ← UX system
docs/skills/                    ← skill specifications
docs/workflows/                 ← process workflows
docs/quality|security|testing|deployment|observability/
docs/decisions/                 ← legacy/open vendor notes (mapped into /adrs)
docs/execution/                 ← plans, logs, self-improvement
docs/integrations/erpnext/      ← ERPNext knowledge + integration boundaries
docs/templates/                 ← templates
.cursor/skills/                 ← executable Cursor skills
.agents/skills/                 ← executable Antigravity skills
```

## Project Folder Structure Governance

Canonical standard: [`docs/architecture/folder-structure.md`](./docs/architecture/folder-structure.md).

The repository follows a strict, predictable architectural structure:

- `app/`: Next.js App Router surfaces — grouped by route audience: `(auth)`, `(merchant)`, `(customer)`, `(admin)`, `(storefront)`, and `/api/v1/*` HTTP handlers.
- `src/`: Application implementation and runtime code only.
- `src/modules/`: Business domain bounded contexts (e.g. `merchant`, `store`, `customer`, `catalog`, `inventory`, `ordering`, `payments`, `loyalty`, `crm`, `notifications`, `identity`, `pos`, `admin`, `analytics`, `accounting`, `erpnext`).
- `src/infrastructure/`: Technical infrastructure implementations (database/Drizzle, Redis, EMQX, MinIO, MongoDB analytics plane, Auth.js runtime, HTTP composition, security hardening).
- `src/shared/`: Shared kernel, DDD primitives, domain value objects (Money, Phone, Quantity), errors, state, and cross-cutting contracts.
- `src/events/`: Event contracts, naming conventions, warehouse mapping, and transactional outbox contracts.
- `src/workers/`: Standalone background runtimes (outbox worker).
- `src/components/` & `src/hooks/`: Reusable React components and hooks.
- `src/lib/`: Low-level utilities (e.g. `cn`).
- `src/types/`: Global ambient TypeScript definitions (e.g. NextAuth augmentations).
- `adrs/`: Architecture decision records (`done/`, `tasks/`, `future/`).
- `docs/`: Technical explanations, architecture guides, product docs, checklists, and rules.
- `scripts/`: Tooling, migration, and setup scripts.
- `e2e/`: Playwright end-to-end test suites.

> **NEVER create a new top-level directory under `src/` merely because an ADR, feature, technology, architectural concern, or task exists.**
>
> Architecture decisions are NOT automatically source-code modules. Before creating a new top-level `src/` directory, the AI must determine whether the code belongs to an existing module, infrastructure area, cross-cutting area, shared area, or application route.

## AI File and Folder Creation Rules

Before creating a new file or directory:

1. **Search for an existing appropriate location** across `src/modules/`, `src/infrastructure/`, `src/shared/`, and `app/`.
2. **Prefer extending an existing module** over creating a new top-level directory.
3. **Do not create architecture-named directories inside `src/`** (e.g. no `src/backend-layering`, `src/database-modeling`, `src/redis-architecture`).
4. **Do not create folders based solely on ADR names.**
5. **Do not create technology-specific top-level directories** unless the architecture explicitly requires them.
6. **Business functionality belongs under `src/modules/<domain>/`.**
7. **Infrastructure belongs under `src/infrastructure/<tech>/`.**
8. **Documentation belongs under `docs/` or `adrs/`.**
9. **Tests belong adjacent to the code they verify** (`*.test.ts`) or in `e2e/`.
10. **Creating a new top-level directory directly under `src/` requires explicit architectural justification and user approval.**

## ADR Governance

### ADR is the source of truth

- All architectural and significant technical decisions live in `/adrs` as `ADR-NNN-*.md`.
- Every feature must map to at least one ADR.
- Every production decision must be documented.
- **No implementation without ADR. No architectural change without ADR update/supersede.**

### ADR Workflow

1. Propose or use existing Accepted ADR  
2. Place on roadmap / respect dependency map  
3. Implement via ard-to-code when prerequisites complete  
4. Validate  
5. Move finished task ADRs `adrs/tasks/` → `adrs/done/` and update `adrs/STATUS.md`  

### ADR Lifecycle

`Proposed` → `Accepted` → (optional `Deprecated` / `Superseded`)  

Implementation tracking (orthogonal): `todo` → `in_progress` → `completed` | `blocked`.

Folder tracking (physical): `adrs/tasks/` (work queue) → `adrs/done/` (architecture-contract landed) · `adrs/future/` (deferred / Proposed vendor).

### Two-axis STATUS truth (ADR-120)

| Axis | Values | Meaning |
| --- | --- | --- |
| Decision | Proposed / Accepted / … | Governance bind |
| Runtime completeness | `contract` / `partial` / `complete` | Product wiring depth |

- **`adrs/done/` + ADR impl `complete`** means **architecture-contract landed** (domain/contracts/tests) — **not** product-runtime complete and **not** ARD `completed`.
- **Product-runtime `complete`** requires evidence of **API + migration + tests** for that surface (ADR-120). Never mark runtime-complete without that evidence.
- **`docs/ards/STATUS.md`** remains the **delivery SoT** for HTTP/UI/infra rollout.

### ADR Status Rules

- **Proposed:** may implement ports/mocks only; do not hard-depend for production go-live (e.g. SMS provider, PSP).  
- **Accepted:** binding; code must conform.  
- **Superseded:** cite replacement ADR; do not implement old decision.  

### ADR Dependency Rules

- Follow `docs/architecture/adr-dependency-map.md`.  
- Do not implement an ADR whose prerequisites are incomplete (unless roadmap allows mock).  
- Parallelize only within parallel sets on the roadmap.
- Product-runtime work selects from **`adrs/tasks/`** only (ard-to-code).  

### ADR Completion Rules

An ADR **architecture-contract** implementation is complete only when:

- Decision realized in code/docs  
- Tests/validations pass  
- Related ARD checklists updated  
- STATUS board updated; file under `adrs/done/`  
- No known contradiction with higher-priority Accepted ADRs  
- Iranian First checks 1–6 above answered; checklist passed for any user-facing scope  

An ADR is **product-runtime complete** only when the above hold **and** API + migration + tests evidence exists for the ADR’s product surface (never mark runtime-complete on contracts alone).  


### ADR Ownership Rules

- Owner default: AI via ard-to-code + human reviewers for Proposed vendor ADRs.  
- Humans accept Proposed ADRs that choose external vendors/legal.  

### ADR Change Management Rules

- Never edit an Accepted ADR’s Decision silently to mean the opposite — write a superseding ADR.  
- Clarifying edits (typos, links) allowed with revision note.  
- Roadmap/dependency map must update when new ADRs are inserted.  

## ARD workflow

ARDs remain delivery packages. Prefer completing ARDs as the packaging of ADR implementation, but **schedule from ADR roadmap**.

1. ARDs live in `docs/ards/` with statuses in `STATUS.md`.
2. Ready queue = unfinished ARDs whose dependencies are `completed`.
3. Execute via **ard-to-code** only (preferred).
4. Mark `completed` only after acceptance + DoD + validations.

Default dependency order is documented in `docs/ards/README.md`.

## Skill workflow

| Skill | Path | Role |
| --- | --- | --- |
| ard-to-code | `.cursor/skills/ard-to-code/SKILL.md` + `docs/skills/ard-to-code.md` | Autonomous implementation loop |
| uiuxpromax-integration | `.cursor/skills/uiuxpromax-integration/` + `docs/skills/uiuxpromax-integration.md` | Mandatory UI gate |
| uiuxpromax | (environment skill) | Design generation — required for UI |

### ard-to-code loop (ADR-driven)

1. List `adrs/tasks/` + read `adrs/STATUS.md` (+ Critical path in `AUDIT_REPORT.md`)  
2. Select first incomplete ADR in **`adrs/tasks/`** with deps in `adrs/done/` (or satisfied)  
3. Read `docs/rules/iranian-first-development.md` + ADR Iranian UX section  
4. Read ADR + dependency ADRs + related ARD localization/RTL sections  
5. Read architecture + AGENT.md + rules  
6. Telemetry / persistence / uiuxpromax / **Iranian First** gates  
7. Write plan `docs/execution/plans/ADR-XXX.md` (include localization tasks)  
8. Implement only that ADR  
9. Test / lint / typecheck / quality gates + Iranian checklist  
10. Move ADR `tasks/` → `done/`; update STATUS (do **not** claim product-runtime complete without api+migration+tests)  
11. Repeat until `adrs/tasks/` empty or blocked  

## Store-First Strategy

Every merchant operates one or more **stores**. Each store is the unit of:

- POS & inventory  
- CRM / **owned customer memberships**  
- Loyalty program (wallet per membership)  
- Dedicated storefront (URL, branding)  
- QR acquisition  
- Installable **store PWA**  
- Pickup fulfillment location (mandatory geo)  

Platform never owns customers as a marketplace. See `store-first-evolution.md`.

## PWA Strategy

| PWA | Audience | ARD |
| --- | --- | --- |
| Merchant staff PWA | Employees / POS | ARD-017 |
| Store PWA | Customers / members | ARD-029 |

Do not mix manifests, icons, or auth audiences.

## Customer Ownership Strategy

- `StoreMembership` is first-class (ARD-031)  
- Join via POS phone, QR/storefront OTP, or pickup checkout  
- Customer portal (ARD-035) is always store-scoped  

## Loyalty Strategy

- Earn on POS sales and paid pickup orders  
- Redeem at POS (and later portal if extended)  
- Customer-visible balances/rewards in store PWA  
- Growth loop: `docs/product/growth-loops-loyalty.md`  

## Pickup-Only MVP Strategy

- Online orders: **in-store pickup only**  
- No delivery addresses, couriers, riders, or shipping in MVP  
- Lifecycle: Pending Payment → Paid → Preparing → Ready For Pickup → Picked Up → Completed (plus Cancelled/Refunded)  
- See `pickup-order-architecture.md` and ARD-034  

## MongoDB Purpose

MongoDB stores **append-heavy analytics and compliance telemetry**:

- Event warehouse copies of domain events  
- Audit log documents  
- Clickstream and sessions  
- Product / feature usage analytics  
- Security monitoring signals  
- Management dashboard rollups  

It does **not** replace PostgreSQL for sales, inventory, wallets, or CRM authoritative state. See `docs/architecture/mongodb-architecture.md` and ADR-0008.

## Analytics Architecture

Two layers:

1. **Merchant OLTP analytics** (ARD-016) — revenue/customers/retention North Star on PostgreSQL projections  
2. **Product/platform analytics** (ARD-021+) — MongoDB funnels, feature usage, warehouse, mgmt dashboards  

See `docs/architecture/analytics-architecture.md`.

## Audit Architecture

Sensitive mutations emit insert-only audit records (Mongo `mos_audit`, optional thin PG). Admin query only. See `docs/architecture/audit-architecture.md` and ARD-022.

## Event Warehouse Architecture

Outbox-driven mirror of domain events into Mongo for investigation and aggregations without OLTP scans. See `docs/architecture/event-warehouse-architecture.md` and ARD-024.

## Product Monitoring Strategy

Instrument activation, POS UX timings, feature keys, and storefront funnels (ARD-023). Monitor reliability via ARD-028 golden signals. Security/abuse via ARD-026.

## User Behavior Tracking Strategy

Clickstream + sessions via beacon APIs (ARD-027); identity stitch after purchase when needed; sample noisy events but keep funnel events at 100%.

## Dashboard Strategy

| Dashboard | Audience | Data |
| --- | --- | --- |
| Merchant overview / AN-* | Merchant | PostgreSQL projections (ARD-013/016) |
| Management | Platform admin | Mongo rollups + selective PG (ARD-025) |
| Security | Platform admin | Mongo signals (ARD-026) |

## Data Retention Strategy

Follow `docs/architecture/data-retention-architecture.md`: short TTL for clickstream, multi-year for audit/security, indefinite OLTP business records with Phase-2 archive, legal hold overrides.

## Database Development Standards

### Why Drizzle

Drizzle ORM is mandatory because MerchantOS needs SQL-first control, strong TypeScript inference, low overhead on POS hot paths, explicit PostgreSQL indexes/constraints, and clean DDD boundaries (domain never imports the ORM). See `docs/tech/drizzle-orm.md` and ADR-0007.

**Forbidden:** Prisma, TypeORM, Sequelize, MikroORM, Objection, or any other ORM.

### How repositories must be implemented

1. Define repository **interfaces** in domain (or application ports).  
2. Implement with Drizzle in infrastructure only.  
3. Map persistence rows ↔ domain aggregates in the adapter (anti-corruption).  
4. Every tenant query filters `merchant_id` from trusted auth context.  
5. Multi-aggregate use cases (especially CompleteSale) use `db.transaction` and pass the transaction handle into repositories.

### How migrations are created

1. Update ARD **Database Design** (tables, indexes, queries, load).  
2. Update Drizzle schema under `src/infrastructure/database/schema/`.  
3. Generate versioned SQL with **Drizzle Kit**.  
4. Review for locks, backfills, index builds, tenancy.  
5. Apply via migrate job before serving new traffic.

### How schema changes are reviewed

Review must confirm: query-first indexes, composite/partial uniques, soft-delete interaction, multi-tenant isolation, and that the ORM schema matches the DB design (never the reverse). No ARD Done without this review.

### How AI should generate future persistence code

1. Read `docs/tech/drizzle-orm.md` and `docs/rules/drizzle-rules.md`.  
2. Read Tier-0 DB docs (`database-architecture`, `indexing-strategy`, `query-strategy`, `data-modeling-guidelines`).  
3. Generate **database design** in the ARD / plan first.  
4. Generate repository contracts.  
5. Generate Drizzle schema + migration plan.  
6. Validate DDD boundaries.  
7. Only then implement repositories and use cases.  

Future generated persistence code must follow: **PostgreSQL + Drizzle ORM + DDD + Repository Pattern + TypeScript strict**.

## Development workflow

1. Sync understanding from PRD + ARD  
2. Complete persistence gate (design → contracts → migrations plan)  
3. Plan in `docs/execution/plans/`  
4. Implement in `src/modules/<context>/` and `src/infrastructure/database/` (once scaffolded by ARD-001)  
5. Validate (including DB quality gate)  
6. Log progress  

### Expected module layout (after ARD-001)

```
src/modules/<context>/{domain,application,infrastructure,api,ui}
src/shared/{ui,kernel,infrastructure,observability}
src/infrastructure/database/{schema,migrations,repositories,drizzle}
app/   # Next.js routes composing modules
```

## Validation workflow

Every ARD completion requires:

- Tests (domain/unit/integration as applicable)
- Lint with **no warnings**
- Typecheck strict
- Architecture/rules conformance (including `drizzle-rules.md` and `iranian-first-development.md`)
- Database quality gate (tables, queries, indexes, tenancy, migrations, cache)
- Security checks when authZ/PII/payments touched
- Lighthouse thresholds when UI primary screens/landing touched
- **Iranian feature checklist** for user-facing scope (Persian, RTL, Jalali, تومان, mobile)

Commands will be defined in package scripts by ARD-001; until then, create them as part of foundation work.

## Release workflow

1. All targeted ARDs `completed` for milestone  
2. Migrations reviewed  
3. Staging deploy (ARD-019/020)  
4. Smoke: auth, POS complete, storefront order, health/ready  
5. Observability verified  
6. Production rollout with zero-downtime strategy  

Never release with failing validation gates.

## Definition of done

### Architecture-contract landed (ADR folder `adrs/done/`, ADR impl `complete`)

- Decision realized as contracts / domain modules / tests  
- Validations green for that package  
- STATUS reflects contract completeness — **not** ARD delivery or production readiness  
- Iranian First answered for any UX in that ADR’s scope  

### Product-runtime complete (ADR-120; typically closes related ARDs)

From PRD §17 — feature/ARD done iff:

- Domain logic in correct layer  
- Tests implemented  
- **HTTP/API surface wired** where the ADR requires product access  
- **Drizzle Kit migrations generated and applied** when PG touched  
- API documented  
- Domain events published where applicable  
- Cache invalidation handled  
- Authorization enforced  
- Audit logs for sensitive mutations  
- Realtime where applicable  
- Mobile responsive (**Iranian Android-class devices**)  
- **Persian + RTL** on merchant/customer surfaces; Jalali + تومان where dates/money shown  
- Lighthouse > 90 on primary screens (landing ≥ 95 when in scope)  
- TypeScript strict passes  
- No ESLint warnings  
- No build warnings  
- **Database design reviewed; Drizzle migrations generated and reviewed** when PG touched  
- **Mongo analytics/audit/tracking requirements reviewed** when telemetry touched  
- **No alternative SQL ORM introduced**; Mongo is not OLTP SoT  
- **`docs/checklists/iranian-feature-checklist.md` passed** when UX in scope  
- Evidence of **api + migration + tests** recorded before any “runtime complete” claim  

## Coding standards

Follow `docs/rules/coding-rules.md`, `typescript-rules.md`, `nextjs-rules.md`, `ddd-rules.md`, `api-rules.md`, `database-rules.md`, `drizzle-rules.md`, `mongodb-rules.md`, `analytics-rules.md`, `audit-rules.md`, `event-rules.md`, `cache-rules.md`, `architecture-rules.md`, **`iranian-first-development.md`**, `ui-rules.md`.

## Security standards

Follow `docs/rules/security-rules.md` and `docs/architecture/06-security-architecture.md`.

Phone OTP auth; JWT stateless; tenant isolation; Zod validation; rate limits; audit logs.

## Testing standards

Follow `docs/rules/testing-rules.md` and `docs/testing/`.

## AI execution standards

1. Prefer ard-to-code for feature delivery.  
2. Read before write.  
3. Smallest change that satisfies the ARD.  
4. Continuously improve docs via `docs/execution/self-improvement.md` without breaking rules.  
5. Propose new ARDs for gaps — do not silently expand scope mid-ARD.  
6. Ask humans only for open questions in PRD §19 or true blockers.  

## Repository governance

- Changes to PRD require human product approval + ADR if architecture impacted.  
- New ARDs use `docs/templates/ard-template.md`.  
- ADRs in `docs/decisions/`.  
- STATUS board is authoritative for autonomous scheduling.  
- Do not use ad-hoc task trackers to replace ARD status.  

## How to start autonomous build

```
Run the ard-to-code skill and continue until `adrs/tasks/` is empty (or blocked)
(or blocked on Proposed vendor ADRs requiring human acceptance).
```

Start at **ADR-001** per `docs/architecture/adr-roadmap.md`.
