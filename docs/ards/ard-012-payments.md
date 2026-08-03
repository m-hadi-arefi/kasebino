# ARD-012 — Payments

| Field | Value |
| --- | --- |
| ID | ARD-012 |
| Title | Payments |
| Status | `todo` (domain foundations via ADR-012; API + migrations remain) |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Introduce payment port/adapters for **pickup online orders** (`pending_payment` → `paid`, refunds) and fee-ready abstractions; mock provider acceptable if PSP undecided.

## Business Value

Unblocks monetization stream and OrderPaid for pickup checkout.

## Requirements

- Business model transaction fees
- OrderPaid, OrderRefunded
- ORD-11 payment/refund statuses
- Open Q on PSP

## Dependencies

- ARD-011

## Architecture

Payments module with PaymentGateway port; sandbox adapter; webhook endpoint stub.

## Domain Model

Payment aggregate minimal.

## API Contracts


| Method | Path |
| --- | --- |
| POST | `/api/v1/payments/intents` |
| POST | `/api/v1/payments/webhooks/:provider` |


## Events

- `OrderPaid (via ordering integration)`

## Caching

No aggressive caching of payment intents.

## Security

Webhook signature verification; never trust client paid flags alone.


## UI Requirements

- No end-user UI in this ARD (API/infra/domain only). If UI sneaks in, stop and update ARD scope.



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`payments`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: payments schema

### Repository Interfaces

PaymentRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Mark paid updates payment+order+outbox

### Caching Strategy

Do not cache intents aggressively


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`payments`

### Relationships

payments.order_id → orders

### Constraints

status checks; provider_ref unique when present

### Indexes

(merchant_id, order_id); (provider_ref)

### Query Patterns

create intent; webhook upsert; mark paid

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: ≈ online orders

### Caching Plan

Do not cache intents aggressively

### Migration Plan

payments schema

## Testing

Sandbox intent + webhook tests.

## Acceptance Criteria

- [ ] Drizzle migrations generated and reviewed
- [x] Table design reviewed
- [x] Query patterns reviewed
- [x] Indexes + composite indexes reviewed
- [x] Multi-tenancy (`merchant_id`) reviewed
- [x] PostgreSQL performance considerations reviewed
- [x] Drizzle schema reviewed against DB design (ORM follows DB)
- [x] Cache strategy reviewed
- [x] Repository interfaces + Drizzle implementations aligned
- [x] Transaction boundaries implemented/documented


- [x] Payment port exists
- [x] Successful sandbox payment marks order paid
- [x] Failures safe and auditable

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
- Iranian PSP assumptions; تومان display clarity.
## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

No ARD is complete without **database design review** and **Drizzle migration review** (see quality gate in `drizzle-rules.md`).

Inherits global DoD from PRD §17 / `docs/product/non-functional-requirements.md`, plus all acceptance criteria above and checklists below.

## Implementation Checklist

- [x] Port+mock adapter
- [x] Wire OrderPaid
- [x] Docs ADR for PSP choice placeholder
- [x] Tests

## Validation Checklist

- [x] iranian-first-development.md conformance
- [x] iranian-feature-checklist.md passed (or N/A with reason)
- [x] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [x] lint
- [x] typecheck
- [x] tests
- [x] security webhook

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
