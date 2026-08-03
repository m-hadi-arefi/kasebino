# ARD-018 — Admin Panel

| Field | Value |
| --- | --- |
| ID | ARD-018 |
| Title | Admin Panel |
| Status | `todo` |
| Milestone | M5 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Platform admin: merchant list/view/activate/suspend, abuse monitoring hooks, realtime admin topics.

## Business Value

Protects platform integrity and supports ops growth.

## Requirements

- ADM-01
- ADM-02
- ADM-03

## Dependencies

- ARD-003
- ARD-015
- ARD-002 roles
- ARD-022 Audit Logging (for enforcement audit)
- ARD-025 Management Dashboards (embed/nav)
- ARD-026 Security Monitoring (abuse hooks)

## Architecture

Admin module separate layouts; platform_admin role gate; audit all enforcement actions via AuditPort (ARD-022).
Abuse/fraud monitoring hooks integrate with ARD-026; management widgets from ARD-025.

## Domain Model

AdminAction audit records; uses Merchant status transitions.

## API Contracts


| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/merchants` |
| GET | `/api/v1/admin/merchants/:id` |
| POST | `/api/v1/admin/merchants/:id/activate` |
| POST | `/api/v1/admin/merchants/:id/suspend` |


## Events

- `MerchantActivated`
- `MerchantUpdated`
- `admin monitoring events`

## Caching

Admin list cache short TTL optional.

## Security

Strict role checks; audit logs; rate limit 20 rps admin.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`admin_actions` (audit) — merchants already exist

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: admin_actions table

### Repository Interfaces

MerchantRepository + AdminActionRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Status change + audit + outbox

### Caching Strategy

Short TTL optional


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`admin_actions` (audit) — merchants already exist

### Relationships

actor admin user

### Constraints

action enum

### Indexes

(created_at DESC); (merchant_id, created_at)

### Query Patterns

list merchants; activate/suspend

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Admin low QPS

### Caching Plan

Short TTL optional

### Migration Plan

admin_actions table

## Testing

AuthZ negative tests.

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


- [ ] Admin can list/view/activate/suspend
- [ ] Fraud hooks emit/monitor placeholders
- [ ] Realtime admin monitoring path exists

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

- [x] Domain foundations (ADR-013): AdminUser / AdminAction / enforcement + AuditPort + platform_admin AuthZ
- [x] uiuxpromax admin (ADR-089 stubs + gate; live charts/HTTP remain)
- [ ] APIs
- [ ] RBAC wiring in routes
- [ ] Tests (HTTP/e2e)

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] security tests

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
