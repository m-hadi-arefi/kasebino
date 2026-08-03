# ARD-014 — Notifications

| Field | Value |
| --- | --- |
| ID | ARD-014 |
| Title | Notifications |
| Status | `todo` |
| Milestone | M3 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

> **ADR-036 foundations (2026-08-03):** Outbox consumer channel `notifications` + Persian toast/drawer copy stubs live in `src/event-driven`.
>
> **ADR-039 foundations (2026-08-03):** MQTT client + Persian reconnect/offline toast copy in `src/realtime-client` (invalidate via notifications channel).
>
> **ADR-090 foundations (2026-08-03):** `src/notifications-architecture` + `src/modules/notifications` — persist in-app, SMS channel ports (mock/console), Persian templates, outbox consumer, OTP log redaction; Drizzle `notifications` stub. This ARD remains `todo` until HTTP list/read, Kit migrations, and uiuxpromax in-app center UI.

## Objective

In-app notification center + plumbing for event-driven alerts (low stock, new orders); SMS campaign hooks optional MVP+.

## Business Value

Keeps merchants responsive to retention and ops signals.

## Requirements

- Realtime notification updates
- Campaign* stubs

## Dependencies

- ARD-001
- ARD-015 recommended

## Architecture

Notifications module; persist notification rows; publish to MQTT notifications topic.

## Domain Model

Notification entity/outbox integration service.

## API Contracts


| Method | Path |
| --- | --- |
| GET | `/api/v1/notifications` |
| POST | `/api/v1/notifications/:id/read` |


## Events

- `Consumes InventoryLow`
- `OrderCreated`
- `Campaign*`

## Caching

Optional short TTL list cache; invalidate on new notification.

## Security

Tenant scoped.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`notifications`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: notifications schema

### Repository Interfaces

NotificationRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Insert notification + optional outbox

### Caching Strategy

Optional short list TTL


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`notifications`

### Relationships

merchant_id + user_id

### Constraints

read_at nullability

### Indexes

(merchant_id, user_id, created_at DESC); unread partial

### Query Patterns

list; mark read; insert from handlers

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Moderate; retain/truncate policy later

### Caching Plan

Optional short list TTL

### Migration Plan

notifications schema

## Testing

Handler idempotency tests.

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


- [ ] New order creates notification
- [ ] List/read APIs work
- [ ] Realtime hook ready

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.
- SMS templates Persian; MSISDN Iran rules.

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

- [ ] Model+API+UI bell
- [ ] Event subscribers
- [ ] Tests

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] tests

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
