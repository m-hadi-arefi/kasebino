# ARD-011 — Orders

| Field | Value |
| --- | --- |
| ID | ARD-011 |
| Title | Orders |
| Status | `todo` |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Online **pickup** order APIs and merchant visibility — status model aligned with pickup lifecycle. Detailed checkout UX & transitions owned with ARD-034.

## Requirements

- SF-03, ORD-10, ORD-11, ORD-12
- Pickup events (not delivery)

## Dependencies

- ARD-010, ARD-005
- ARD-006 optional reserve
- ARD-012 payment → Paid
- ARD-034 Pickup Order Flow
- ARD-030/031 for customer membership on checkout

## Architecture

Ordering module; **pickup-only** state machine per `pickup-order-architecture.md`; realtime notify merchants.
Statuses: pending_payment → paid → preparing → ready_for_pickup → picked_up → completed | cancelled | refunded.

## API Contracts


| Method | Path | Headers |
| --- | --- | --- |
| POST | `/api/v1/orders` | Idempotency-Key |
| GET | `/api/v1/orders` | merchant |
| GET | `/api/v1/orders/:id` | |
| POST | `/api/v1/orders/:id/cancel` | |
| POST | `/api/v1/orders/:id/deliver` | |


## Events

- `OrderCreated`
- `OrderPaid`
- `OrderCanceled`
- `OrderDelivered`

## Caching

Invalidate order lists; analytics revenue keys on paid.

## Security

Public create rate-limited; merchant mutations authZ.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`orders`, `order_lines`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: ordering schema

### Repository Interfaces

OrderRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Create order+lines+outbox; status changes + outbox

### Caching Strategy

order list/detail invalidate on events


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`orders`, `order_lines`

### Relationships

lines → orders; merchant/store optional

### Constraints

status machine checks; idempotency unique; money >= 0

### Indexes

status+created_at; customer+created_at; payment_status+created_at

### Query Patterns

create order; list open; transition status

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Grows with online GMV; design like sales

### Caching Plan

order list/detail invalidate on events

### Migration Plan

ordering schema

## Testing

Transition tests; idempotent create.

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


- [ ] Anonymous visitor can place order
- [ ] Merchant sees order
- [ ] Realtime notification hook (ARD-015)

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

- [x] Domain foundations (Order aggregate + pickup status machine + timer use cases + ports) — ADR-011
- [ ] Domain+API+merchant UI
- [ ] Storefront checkout UI
- [ ] Tests (API/e2e)

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
