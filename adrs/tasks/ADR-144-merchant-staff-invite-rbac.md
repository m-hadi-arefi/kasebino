# ADR-144: Merchant Staff Invite and Role Assignment

| Field | Value |
| --- | --- |
| ID | ADR-144 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` High #5 |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

RBAC matrix and route enforcement exist (`src/rbac`, ADR-113), but there is no employee invite/CRUD or durable store↔role assignment. JWT often defaults toward owner when roles empty — cashiers cannot be safely provisioned.

## Current State

- Users: `auth_users` (`schema/identity.ts`)
- OTP merchant login works
- Roles: `merchant_owner`, `store_manager`, `store_employee`, aliases in `src/rbac/index.ts`
- Finance perms: `finance.view` / `finance.manage` (ADR-141)
- Missing: invite API, staff list UI, per-store grants table, role admin UX
- No `app/(merchant)/staff` routes

## Decision

Add staff invite-by-phone OTP, owner-managed role assignment (`store_manager` | `store_employee`), and optional store scope list persisted and reflected in JWT claims on login.

## Scope

Included:

- Schema for staff membership/assignments (or extend `auth_users`)
- APIs: invite, list, update role/stores, deactivate
- Merchant UI (Persian RTL) for staff management
- JWT claim population from assignments
- Deny finance for `store_employee` already in matrix — verify end-to-end

Excluded:

- Platform admin staff
- HR payroll
- Customer accounts
- Fine-grained custom permissions beyond canonical roles

## Technical Design

### Database

Preferred:

- `staff_memberships` (`id`, `merchant_id`, `auth_user_id`, `role`, `status`, timestamps)
- `staff_store_scopes` (`staff_membership_id`, `store_id`) unique pair
- Indexes: `(merchant_id)`, `(auth_user_id)`

### Backend

- Use-cases under `identity` or new `staff` module — prefer `identity` application to avoid BC sprawl.
- Invite creates pending user + OTP challenge; accept binds phone.
- Authorization: only `merchant_owner` (and optionally `store_manager` for employee-only invites) — encode clearly.

### Frontend

- `/staff` list + invite dialog + role select + store multi-select (uiuxpromax brief).
- Nav item for owner/manager.

### Security

- Never allow privilege escalation to `merchant_owner` via self-service.
- Tenant asserts on every mutation.
- Audit Mongo action on invite/role change if audit port available.

## Implementation Plan

1. Schema + migration via drizzle-kit.
2. Use-cases + Drizzle repos.
3. HTTP handlers + RBAC.
4. JWT enrichment on OTP verify.
5. Persian UI + tests.

## Data Model Changes

Tables: `staff_memberships`, `staff_store_scopes` (names flexible)  
Fields: role enum as varchar with app validation  
Indexes: merchant + user uniqueness  
Relations: logical FKs to merchants/stores/auth_users (app-level OK; optional SQL FKs in ADR-150)

## API Changes

Routes (proposed):

- `GET /api/v1/staff`
- `POST /api/v1/staff/invites`
- `PATCH /api/v1/staff/{id}`
- `POST /api/v1/staff/{id}/deactivate`

Request: `{ phoneE164, role, storeIds[] }`  
Response: staff DTO without secrets

## Frontend Changes

Pages: `app/(merchant)/staff`  
Components: invite form, role badges (Persian labels)  
User flows: owner invites cashier → cashier OTP login → POS allowed, finance denied

## Testing Requirements

Unit: role matrix + invite rules  
Integration: JWT claims after accept  
E2E: owner invite → employee login → 403 on `/finance`

## Acceptance Criteria

- [ ] Owner can invite employee bound to stores
- [ ] Employee JWT carries `store_employee` + scopes
- [ ] Cashier cannot access finance APIs/UI
- [ ] Manager can access finance per matrix
- [ ] Deactivated staff cannot login
- [ ] Persian RTL staff UI + uiux brief

## Dependencies

Required before: identity OTP (done), RBAC (done)  
Depends on: none  
Recommended SMS: ADR-115 for production OTP delivery

## Migration / Rollout Plan

1. Existing owner accounts remain `merchant_owner` without row (bootstrap default).
2. Migrate implicitly on first invite feature enable.
