# ARD-015 — Realtime Layer

| Field | Value |
| --- | --- |
| ID | ARD-015 |
| Title | Realtime Layer |
| Status | `todo` |
| Milestone | M3 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

> **ADR-036 foundations (2026-08-03):** Canonical envelope + `emqx_realtime` outbox consumer channel in `src/event-driven`.
>
> **ADR-035 foundations (2026-08-03):** Outbox poll/dispatch worker skeleton in `src/outbox` with fan-out consumer slots including `emqx_realtime`.
>
> **ADR-038 foundations (2026-08-03):** EMQX publish package in `src/emqx-realtime` (tenant topics, QoS1 port, ACL + short-lived cred mint, outbox→MQTT handler, in-memory broker).
>
> **ADR-039 foundations (2026-08-03):** Browser/staff client in `src/realtime-client` + `POST /api/v1/realtime/token` (MQTT-over-WS preferred, TanStack Query invalidate, poll fallback, reconnect backoff, Persian reconnect copy).
>
> **ADR-124 runtime (2026-08-05):** mqtt.js browser transport + `useRealtimeStoreChannel` wired on merchant orders board / POS / notifications; token scoped to active store; `NEXT_PUBLIC_MOS_MQTT_CLIENT=0` poll-only. Full Compose EMQX subscriber e2e may still keep this ARD `todo` until ops smoke.

## Objective

EMQX integration: outbox publisher, topic ACL model, client token minting, frontend subscription helpers with poll fallback.

## Business Value

Live inventory/sales/orders/dashboard updates without refresh.

## Requirements

- PRD §11.5
- ADM-03 hooks

## Dependencies

- ARD-001
- events from prior ARDs

## Architecture

Realtime module + shared MQTT infra; map event types to topics per architecture docs.

## Domain Model

No domain aggregates; infrastructure + application publishers.

## API Contracts


| Method | Path |
| --- | --- |
| POST | `/api/v1/realtime/token` | short-lived MQTT creds |


## Events

- `Publishes all catalog events relevant to UI`

## Caching

N/A beyond token non-caching.

## Security

Topic ACL; tenant isolation on subscribe.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

Uses `outbox_events`; no new business tables

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: Possibly alter outbox for attempts/locked_at

### Repository Interfaces

OutboxRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Publish mark in small TX per batch

### Caching Strategy

N/A


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

Uses `outbox_events`; no new business tables

### Relationships

N/A

### Constraints

outbox delivery columns

### Indexes

Confirm outbox worker partial index

### Query Patterns

poll outbox; mark published

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Event volume ≈ writes

### Caching Plan

N/A

### Migration Plan

Possibly alter outbox for attempts/locked_at

## Testing

Publish integration test with EMQX in compose.

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


- [ ] SaleCompleted visible to subscriber
- [ ] OrderCreated notifies merchant topic
- [x] Offline MQTT → poll fallback documented/implemented

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.

## RTL Requirements

- Implement RTL-first (`dir=rtl`, logical CSS).
- Mirror directional icons/navigation.
- No LTR-only layouts for in-scope screens.

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

- [x] Outbox worker
- [x] Token API
- [x] Client hook
- [x] Tests

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] compose emqx test

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
