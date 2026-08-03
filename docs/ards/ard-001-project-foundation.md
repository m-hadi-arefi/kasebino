# ARD-001 — Project Foundation

| Field | Value |
| --- | --- |
| ID | ARD-001 |
| Title | Project Foundation |
| Status | `todo` |
| Milestone | M0 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

> **ADR-035 foundations (2026-08-03):** Outbox worker skeleton in `src/outbox` (`InMemoryOutboxStore`, poll/dispatch, idempotent processed set) + Drizzle stubs `outbox_events` / `processed_events`. This ARD remains `todo` until Kit migrations, Drizzle OutboxRepository, health ready probe, and partial pending index SQL.
>
> **ADR-052–054 cache foundations (2026-08-03):** `src/cache-aside`, `src/cache-keys`, `src/cache-invalidation` (SaleCompleted/ProductUpdated/StoreUpdated maps + `invalidateOnEvent`). Domain adapters still wire outbox `cache_invalidation` handlers.
>
> **ADR-027 forms (2026-08-03):** `zod` + `react-hook-form` + `@hookform/resolvers` landed in `src/forms-validation` (Persian errors, Iranian phone, تومان helpers). Env boot remains zod-free `parseEnv` until optional migrate.
>
> **ADR-040 foundations (2026-08-03):** MinIO object storage in `src/minio-storage` + `src/infrastructure/minio/client.ts`. Real S3 SDK adapter remains.
>
> **ADR-038 foundations (2026-08-03):** EMQX realtime in `src/emqx-realtime` + `src/infrastructure/emqx/client.ts` (MQTT_URL stub). Real mqtt.js *publish* protocol adapter remains.
>
> **ADR-039 foundations (2026-08-03):** Realtime client strategy in `src/realtime-client` + `app/api/v1/realtime/token` (MQTT-over-WS + poll fallback). mqtt.js browser socket adapter optional.

## Objective

Bootstrap the MerchantOS modular monolith repository: tooling, folder structure, Docker Compose parity, CI skeleton, env validation, health endpoints, and DDD module scaffolding — without implementing business features.

## Business Value

Creates the execution substrate so subsequent ARDs can land code safely with local parity and quality gates.

## Requirements

- NFR-02, NFR-03, NFR-05 (foundation pieces)
- PRD §11 infrastructure Docker Compose requirement
- PRD §12 stack locked (Next.js, TS, Drizzle ORM, Tailwind, etc. wired empty)

## Dependencies

- None — first ARD

## Architecture


Establish:
- Next.js 15+ App Router TypeScript app
- `src/modules/*` empty bounded-context folders per domain map
- `src/shared` for kernel (result types, env, logging facade)
- Drizzle ORM + PostgreSQL connection
- Redis/EMQX/MinIO/**MongoDB** client stubs with health checks
- `docker-compose.yml` for postgres, redis, emqx, minio, **mongo**, app
- ESLint, Prettier, strict TS, basic CI (lint/typecheck/test)
- `/api/health` and `/api/ready`


## Domain Model


Shared kernel only:
- Value objects placeholders: `MerchantId`, `PhoneNumber` types
- No business aggregates yet


## API Contracts


| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| GET | `/api/ready` | checks DB (+ redis if required) |


## Events

- None

## Caching

No business cache yet; Redis connectivity verified.

## Security

No secrets in git; `.env.example` only; secure defaults.


## UI Requirements

- No end-user UI in this ARD (API/infra/domain only). If UI sneaks in, stop and update ARD scope.



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`outbox_events`, `processed_events`, `audit_logs`, `idempotency_keys` (baseline platform tables); Drizzle client + empty context schema modules

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: Initial Drizzle Kit migration creating platform tables + extensions (pgcrypto/uuid, pg_trgm optional)

### Repository Interfaces

OutboxRepository (iface + Drizzle impl stub), Health uses raw db execute via infra only — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

N/A business UoW; establish transaction helper

### Caching Strategy

None business; Redis ping only


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`outbox_events`, `processed_events`, `audit_logs`, `idempotency_keys` (baseline platform tables); Drizzle client + empty context schema modules

### Relationships

Platform tables only; FKs deferred to domain ARDs

### Constraints

UUID PKs; created_at/updated_at on all; check published_at nullability patterns on outbox

### Indexes

outbox partial (published_at IS NULL); processed_events UNIQUE(event_id); idempotency UNIQUE(merchant_id, key) when merchant present

### Query Patterns

ready probe SELECT 1; outbox poll stub

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Negligible until sales; design for 50M events lifetime

### Caching Plan

None business; Redis ping only

### Migration Plan

Initial Drizzle Kit migration creating platform tables + extensions (pgcrypto/uuid, pg_trgm optional)

## Testing

Compose up smoke; health/ready tests; CI pipeline dry run.

## Acceptance Criteria

- [ ] Drizzle migrations generated and reviewed
- [ ] Table design reviewed
- [ ] Query patterns reviewed
- [ ] Indexes + composite indexes reviewed
- [ ] Multi-tenancy (`merchant_id`) reviewed
- [ ] PostgreSQL performance considerations reviewed
- [ ] Drizzle schema reviewed against DB design (ORM follows DB)
- [ ] Cache strategy reviewed
- [ ] Repository interfaces + Drizzle implementations aligned
- [ ] Transaction boundaries implemented/documented


- [ ] Local stack boots via Docker Compose (including MongoDB)
- [ ] Typecheck & lint pass on empty/skeleton code
- [ ] Health returns 200; ready fails closed if DB down
- [ ] Module folders exist for all MVP contexts
- [ ] Mongo connectivity verified (soft dependency documented for ready)

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.
- i18n plumbing installed early even if some strings temporary.

## RTL Requirements

- Implement RTL-first (`dir=rtl`, logical CSS).
- Mirror directional icons/navigation.
- No LTR-only layouts for in-scope screens.
- Scaffold app shell with `lang=fa` `dir=rtl` defaults for product apps.

## Persian UX Requirements

- Persian typography; strings must not clip or overflow.
- Plain-language errors for traditional merchants.
- Jalali dates + تومان formatting wherever shown.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

No ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).

Inherits global DoD from PRD §17 / `docs/product/non-functional-requirements.md`, plus all acceptance criteria above and checklists below.

## Implementation Checklist

- [x] Scaffold Next.js + TS strict
- [x] Add Docker Compose services
- [ ] Add Drizzle schema baseline
- [ ] Add CI workflow
- [ ] Add health/ready routes
- [x] Add env schema (`src/env-secrets` zod-free `parseEnv`; Zod optional later)
- [ ] Document runbook in docs/deployment/local.md

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] unit smoke
- [ ] compose smoke
- [ ] architecture folder conventions present

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
