# ARD-003 — Merchant Management

| Field | Value |
| --- | --- |
| ID | ARD-003 |
| Title | Merchant Management |
| Status | `todo` |
| Milestone | M0 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Create and manage Merchant aggregate: registration, profile update, activation status, slug, and settings shell.

## Business Value

Establishes tenant root for all multi-tenant data.

## Requirements

- AUTH-06
- ADM-01 hooks
- Merchant* events from catalog

## Dependencies

- ARD-001
- ARD-002

## Architecture

Merchant module; status state machine draft→active→suspended; settings key-value or typed settings VO.

## Domain Model

Aggregate Merchant; repos; events MerchantCreated/Activated/Updated.

## API Contracts


| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/merchants` | create on registration |
| GET | `/api/v1/merchants/me` | current tenant |
| PATCH | `/api/v1/merchants/me` | update profile |


## Events

- `MerchantCreated`
- `MerchantActivated`
- `MerchantUpdated`

## Caching

Cache `merchant:profile` TTL 300s; invalidate on update/activate.

## Security

Only owner can mutate; admin suspend later in ARD-018.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`merchants`, `merchant_settings`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: merchant schema + FKs

### Repository Interfaces

MerchantRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Register: user+merchant+outbox when combined with auth

### Caching Strategy

`merchant:profile` TTL 300s; invalidate on update


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`merchants`, `merchant_settings`

### Relationships

merchants.owner_user_id → auth_users.id

### Constraints

UNIQUE(slug); status check; settings keyed uniquely per merchant

### Indexes

UNIQUE(slug); (status); (owner_user_id)

### Query Patterns

create merchant; get by id; get me; update profile; admin list later

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: 50k merchants target; tiny vs sales

### Caching Plan

`merchant:profile` TTL 300s; invalidate on update

### Migration Plan

merchant schema + FKs

## Testing

Tenant isolation; activation policy tests.

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


- [ ] Registration can create merchant
- [ ] Profile read/update works
- [ ] Events published via outbox
- [ ] Cache invalidated on update

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

- [x] Domain model
- [ ] APIs
- [ ] Outbox events
- [ ] Cache invalidation
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
- [ ] tests
- [ ] event catalog conformance

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
