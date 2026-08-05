# ADR-095 - Wire NextAuth/Auth.js App Router Handlers, Sessions, and Merchant OTP UI

| Field | Value |
| --- | --- |
| ID | ADR-095 |
| Status | `Accepted` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/done/` |

## Status

`Accepted` — Auth.js App Router wiring landed 2026-08-05. Tracking: `adrs/STATUS.md`.

## Title

Wire NextAuth/Auth.js App Router Handlers, Sessions, and Merchant OTP UI

## Context

NextAuth config factory exists under identity infrastructure but there is no `auth.ts` / `app/api/auth/[...nextauth]` wiring. Middleware only sets audience headers. Merchant login/register UI is missing (AUTH-01..06).

## Problem Statement

No JWT session can be established; merchants cannot authenticate; realtime token currently trusts `x-merchant-id` header bypass.

## Goals

- Working Auth.js handlers for merchant + customer JWT sessions.
- Merchant OTP login/registration pages (Persian RTL).
- Secure cookies, `tokenVersion` claims, route protection for merchant/admin/customer portal surfaces.
- Dev OTP returned only under explicit local allow flags (AUTH-03); never in staging/production (AUTH-04).

## Non Goals

- Email/password auth.
- Production SMS vendor selection (ADR-115 / ADR-083).
- Full post-login onboarding wizard (ADR-121).
- Complete customer portal (ADR-103).

## Functional Requirements

- FR-1: Merchant phone OTP request + verify establishes session (AUTH-01..05).
- FR-2: First registration path can create merchant (AUTH-06) then hand off to ADR-121.
- FR-3: Customer audience JWT claims separated (ADR-032/033).
- FR-4: Protect `/dashboard`, `/pos`, `/admin`, `/s/[slug]/dashboard/**`.
- FR-5: Replace `x-merchant-id` bypass on realtime token.
- FR-6: Include `app/` in lint and Next typechecking/build gates.

## Technical Design

1. Add `auth.ts` exporting handlers/`auth`/`signIn`/`signOut` from existing config factories.
2. Add `app/api/auth/[...nextauth]/route.ts`.
3. Merchant UI: `/login`, `/register` (phone + OTP steps).
4. Edge-compatible middleware session checks + audience classification.
5. Tighten `shouldReturnDevOtp` to `NODE_ENV===development` or `MOS_RETURN_DEV_OTP=1` only.

## Database Changes

- Uses identity tables via ADR-093 (auth users, OTP challenges).

## Backend Changes

- Auth.js wire + OTP handlers calling identity use cases.
- Server-component session helpers.

## Frontend Changes

- Persian RTL OTP login/register screens (uiuxpromax first; ADR-114 primitives preferred).
- Iranian phone keypad UX; clear recovery (ADR-028).

## Admin Changes

- Admin routes require `platform_admin` session (full enforcement ADR-113).

## API Changes

- Auth.js routes + merchant OTP endpoints (coordinate path names with ADR-094).

## Security Considerations

- Secure / HttpOnly / SameSite cookies (ADR-033/076).
- CSRF strategy for App Router mutations.
- Console SMS adapters must not default outside local.
- Staging must never return `devOtp` in JSON.

## Edge Cases

- OTP expiry / max attempts.
- Concurrent verify with same OTP.
- Existing phone login vs new registration fork.

## Acceptance Criteria

- [ ] Merchant OTP → JWT → protected `/dashboard` works locally.
- [ ] Production and staging responses never include OTP.
- [ ] Realtime token rejects unauthenticated callers.
- [ ] `app/` included in lint and Next build typechecking.
- [ ] Persian/RTL login UI passes Iranian feature checklist.

## Rollout Plan

1. Wire Auth.js + merchant OTP APIs.
2. Ship login UI.
3. Lock down middleware.
4. Remove header identity bypass.

## Dependencies

- ADR-031, ADR-032, ADR-033, ADR-034, ADR-093
- ADR-114 recommended for form controls

## Risks

- Auth.js beta API churn.
- Dual-audience cookie collision if cookie path/name not isolated.

## Related Documents

- `PRD.md` AUTH-*
- `src/modules/identity/`

## Iranian User Experience Requirements

- Persian copy + RTL for login/register.
- Iranian phone validation (`09xxxxxxxxx`).
- Persian OTP SMS templates even with console adapter.
- Obey `docs/rules/iranian-first-development.md` and Iranian feature checklist.

## Estimated Complexity

**L**
