# ARD-030 — Customer Identity Platform

| Field | Value |
| --- | --- |
| ID | ARD-030 |
| Title | Customer Identity Platform |
| Status | `todo` |
| Milestone | M4 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 (ADR-032 OTP foundations) |
| Source | store-first-evolution.md |

## Objective

SMS OTP authentication for **customers** (store members), separate from merchant staff auth (ARD-002), issuing customer JWTs for storefront/PWA/portal.

## Business Value

Enables owned digital relationships beyond the counter.

## Requirements

- CUST-01
- AUTH-01..05 patterns applied to customer audience (dev/prod OTP rules)
- Rate limits on OTP

## Dependencies

- ARD-001
- ARD-002 patterns (shared OTP infra ports OK; distinct claims/roles)
- ARD-031 for post-login membership join

## Architecture

Customer identity module; JWT claims include `sub`, `role=customer`, no merchant staff permissions.
Must not allow customer token to call merchant POS admin APIs.

## Domain Model

CustomerIdentity / OtpChallenge (customer audience).

## API Contracts

| Method | Path |
| --- | --- |
| POST | `/api/v1/customer/auth/otp/request` |
| POST | `/api/v1/customer/auth/otp/verify` |
| POST | `/api/v1/customer/auth/logout` |

## Events

- `CustomerLoggedIn`, `CustomerLoggedOut`

## Persistence Strategy

### PostgreSQL + Drizzle

`customer_identities` / reuse customers table with auth fields — design in ARD DB section at impl time; UUID PK; phone unique.

### MongoDB

Audit auth failures via ARD-022 when available.

## Analytics / Audit / Tracking Requirements

- Analytics: OTP funnel
- Audit: suspicious auth
- Tracking: login success in store PWA
- Metrics: OTP success rate (customer)

## UI Requirements

- **uiuxpromax REQUIRED** for customer OTP screens

## Acceptance Criteria

- [ ] Customer OTP login works (dev OTP in response; prod SMS)
- [ ] Customer JWT cannot access merchant routes
- [ ] Rate limits enforced
- [ ] Works inside store PWA context

## Localization Requirements

- Default locale `fa-IR`; all merchant/customer copy Persian.
- API human messages Persian or code→Persian map.
- Follow `docs/rules/iranian-first-development.md`.
- Storefront SEO metadata Persian when applicable.

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
- Customer journeys assume phone OTP + store visit.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + security rules for dual-audience auth.

## Implementation Checklist

- [x] Read membership + storefront-pwa architectures
- [x] Separate auth routes/claims (contract + module; handlers deferred)
- [ ] uiuxpromax (OTP screens → ADR-023)
- [x] Tests (incl. audience isolation / consent / Persian errors)
- [ ] STATUS (foundations via ADR-032; remain todo until session wire + UI + Drizzle)

## Delivery notes (ADR-032)

- `src/customer-auth` + `src/modules/customer-identity` OTP foundations landed (SmsPort mock/console; explicit consent).
- Remaining for ARD completion: Route Handlers, customer JWT session, Drizzle `customer_identities`, Redis rate-limit wire, storefront OTP UI.

## Completion Protocol

Update STATUS + progress-log.
