# RBAC Audit — Implementation Report (ADR-156)

Date: 2026-08-29  
ADR: `adrs/done/ADR-156-rbac-session-claim-refresh.md`

## Architecture (as implemented)

MerchantOS uses **canonical role RBAC** (`ADR-034`) with JWT claims mirrored in the Auth.js session:

| Role | AuthZ source |
| --- | --- |
| `merchant_owner` | `ROLE_PERMISSION_MATRIX.merchant_owner` (hardcoded) |
| `store_manager` / `store_employee` | Matrix + optional custom roles via `role_permissions` |
| `platform_admin` | Matrix (`admin.platform`) |
| `customer` | `customer.self` only |
| Custom merchant roles | PG `roles` + `role_permissions` (ADR-144+) |

Frontend `PermissionsProvider` mirrors claims for nav/UI only. **Backend `requirePermission` remains authoritative.**

## Root cause of empty seller panel

1. OTP sign-in for a new user writes JWT with `merchantId: null`, `roles: []`, `permissions: []`.
2. Auth.js `jwt` callback previously returned the stale token when no Credentials `user` was present.
3. Onboarding `createMerchant` set `ownerUserId` then called `router.refresh()` — refresh did **not** upgrade claims.
4. `MERCHANT_NAV` requires a permission on every item → empty claims → empty sidebar.
5. APIs already called `hydrateMerchantSessionClaims` (roles only); **merchant layout did not**.

Not the cause: missing DB role seed for owners (owners never depended on PG roles for AuthZ).

## Permission inventory (22)

From `PERMISSIONS` in `src/infrastructure/security/rbac/index.ts`:

`merchant.read`, `merchant.write`, `merchant.billing`, `merchant.settings_destructive`, `merchant.staff_manage`, `store.read`, `store.write`, `pos.sale`, `crm.read`, `crm.write`, `loyalty.read`, `loyalty.write`, `inventory.read`, `inventory.write`, `pickup.manage`, `finance.view`, `finance.manage`, `purchase.view`, `purchase.manage`, `supplier.view`, `customer.self`, `admin.platform`.

## Role matrix (system)

| Role | Notable grants / denials |
| --- | --- |
| merchant_owner | Full merchant matrix including billing, staff, finance |
| store_manager | Ops + finance.view; no destructive owner-only |
| store_employee | POS/CRM/inventory; **no** finance.view / billing |
| customer | `customer.self` only |
| platform_admin | `admin.platform` (+ platform matrix) |

## Default assignment

| State | Claims |
| --- | --- |
| OTP, no merchant / staff | empty roles → onboarding allowed |
| `merchants.ownerUserId` set | `merchant_owner` + owner matrix |
| Active staff membership | membership roleIds + effective permissions + storeIds |
| Active platform admin | `platform_admin`, `merchantId: null` |

## What ADR-156 fixed

1. Shared `resolveMerchantSessionClaims` used by OTP `resolveClaims` and JWT `refreshClaims`.
2. JWT callback refreshes when roles empty (or non-admin missing `merchantId`), and on `trigger === "update"`.
3. `hydrateMerchantSessionClaims` now also sets **permissions** from owner matrix.
4. Merchant layout hydrates before `PermissionsProvider`.
5. Idempotent `ensureSystemRoles` / `ensureSystemRolesOnce` seeds PG system roles on first `listRoles` / `getRole` (staff UI).

## Deferred

- Renaming roles to STORE_OWNER / SALES_STAFF
- User-specific permission allow/deny overlays
- Full permission-management UX redesign beyond `/staff`
- Wiring unused `purchase.*` / `supplier.*` HTTP surfaces

## Acceptance evidence

- Unit: JWT empty → `merchant_owner` after ownership mock
- Unit: hydrate sets permissions
- Unit: empty vs owner nav filter
- Unit: idempotent system role seed
- Focused vitest + typecheck / lint / build (see progress log)
