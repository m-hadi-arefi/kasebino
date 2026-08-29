# ADR-156: RBAC Session Claim Refresh After Onboarding

| Field | Value |
| --- | --- |
| ID | ADR-156 |
| Status | `Accepted` |
| Date | 2026-08-29 |
| Origin | Empty seller panel after register/onboarding |
| Folder | `adrs/done/` |

## Status

Accepted — implemented.

## Context

New merchants receive a JWT with `roles: []` / `permissions: []` at OTP (pre-merchant). Creating a merchant sets `ownerUserId` but does not refresh JWT claims. Merchant shell filters `MERCHANT_NAV` by session permissions → empty sidebar. HTTP APIs already hydrate owner via `hydrateMerchantSessionClaims`; the layout does not.

## Decision

1. Extract shared `resolveMerchantSessionClaims(authUserId)`.
2. Auth.js `jwt` callback re-resolves claims when merchant audience has null `merchantId` or empty `roles` (after merchant/staff exists → `merchant_owner` or staff roles).
3. Merchant layout hydrates session with roles **and** permissions for defense in depth.
4. Idempotent PG seed of canonical system roles for staff UI listing (AuthZ for owners remains `ROLE_PERMISSION_MATRIX`).

## Iranian User Experience

Auth plumbing — no new merchant-facing copy required. Nav becomes usable in Persian RTL shell after onboarding without re-OTP.

## Scope

Included: claim resolver, JWT refresh, layout hydrate, system role seed, tests, audit report.

Excluded: new role taxonomy, permission overrides, ABAC, purchase/supplier HTTP wiring.

## Acceptance Criteria

- [x] After createMerchant + refresh, seller nav shows authorized items without re-login
- [x] Pre-merchant OTP still has empty roles (onboarding allowed)
- [x] Hydrate sets permissions when inventing owner roles
- [x] System roles seedable idempotently in PG
- [x] Focused tests + typecheck/lint/build
