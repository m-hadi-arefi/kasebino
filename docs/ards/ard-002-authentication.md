# ARD-002 — Authentication

| Field | Value |
| --- | --- |
| ID | ARD-002 |
| Title | Authentication |
| Status | `todo` |
| Milestone | M0 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | PRD.md |

## Objective

Implement phone-only OTP authentication for **merchant staff/owners** with NextAuth JWT strategy, rate limits, and dev/prod OTP behavior differences.  
**Customer OTP is ARD-030** (separate audience/claims).

## Business Value

Enables secure merchant access — prerequisite for all tenant operations.

## Requirements

- AUTH-01
- AUTH-02
- AUTH-03
- AUTH-04
- AUTH-05
- AUTH-06 (hook)
- NFR-04 rate limits
- Must not issue customer-role tokens (ARD-030)

## Dependencies

- ARD-001

## Architecture


Identity module with OTP challenge aggregate, SMS port, NextAuth JWT callbacks, Redis rate limiting for auth/OTP routes.


## Domain Model


Aggregates: AuthUser, OtpChallenge. Events: MerchantLoggedIn, MerchantLoggedOut. Optional call into MerchantCreated on first register (coordinate ARD-003).


## API Contracts


| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/otp/request` | `{phone}` | `{devOtp?}` |
| POST | `/api/v1/auth/otp/verify` | `{phone,code}` | session/JWT established |
| POST | `/api/v1/auth/logout` | — | cleared cookie |


## Events

- `MerchantLoggedIn`
- `MerchantLoggedOut`

## Caching

Rate limit keys `mos:{env}:rl:otp:{phone|ip}`; no profile caching required.

## Security

OTP hashed at rest; never return OTP in production; JWT httpOnly cookie; rate limits 3/min OTP, 5/min auth.


## UI Requirements

- **uiuxpromax REQUIRED** before any UI implementation
- Follow `docs/uiux/*` and `docs/skills/uiuxpromax-integration.md`



## Persistence Strategy

**ORM:** Drizzle ORM (mandatory, exclusive)

### Required Schema

`auth_users`, `otp_challenges`

### Required Migrations

- Design tables/indexes in this ARD first
- Encode in `src/infrastructure/database/schema/<context>.ts`
- Generate with **Drizzle Kit**; commit versioned SQL under `src/infrastructure/database/migrations/`
- Review migration for locks, NOT NULL backfills, index build strategy
- Apply via migrate job before app traffic

Migration plan: Add identity schema module + Drizzle Kit migration

### Repository Interfaces

AuthUserRepository, OtpChallengeRepository — interfaces in domain/application; **no Drizzle types leak** across the boundary.

### Repository Implementations

Drizzle implementations in infrastructure (`src/modules/.../infrastructure/persistence` and/or `src/infrastructure/database/repositories`).

### Transaction Boundaries

Verify OTP consume + optional user create in one TX

### Caching Strategy

Rate limits in Redis; no user entity cache required


## Database Design

> Tier-0 review required. Align with `docs/architecture/database-architecture.md`, `indexing-strategy.md`, `query-strategy.md`, `data-modeling-guidelines.md`.

### Tables

`auth_users`, `otp_challenges`

### Relationships

auth_users.id referenced later by merchant owner; no FK required yet

### Constraints

UNIQUE(phone) on auth_users; otp hashed; expires_at; attempts check

### Indexes

(phone); (phone, created_at DESC) on otp_challenges; expires_at for GC

### Query Patterns

request OTP insert; verify latest challenge; upsert auth user by phone

### Estimated Load

| Merchants | Notes |
| --- | --- |
| 10 | Dev/pilot scale |
| 500 | Early growth |
| 5,000 | Regional |
| 50,000 | Design envelope |

Detail: Auth users ≈ merchants×staff; OTP rows high churn — retain short

### Caching Plan

Rate limits in Redis; no user entity cache required

### Migration Plan

Add identity schema module + Drizzle Kit migration

## Testing

Unit: OTP policy. Integration: request/verify; prod flag hides OTP; rate limit trips.

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


- [ ] Phone OTP login works e2e in prod-mode config via SMS port mock/provider
- [ ] Dev mode includes OTP; production response never includes OTP
- [ ] OTP routes enforce rate limits
- [ ] JWT issued only after successful verify

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

- [x] Implement domain + use cases (foundations; in-memory repos until Drizzle)
- [x] Wire NextAuth JWT
- [x] SMS adapter + dev adapter (console/mock; provider ADR-083 Proposed)
- [ ] Redis rate limits
- [ ] Auth UI screens via uiuxpromax
- [x] Tests + docs (ADR-031 unit coverage; e2e deferred)

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] drizzle-rules.md conformance
- [ ] database design quality gate
- [ ] Drizzle Kit migration reviewed


- [ ] lint
- [ ] typecheck
- [ ] unit
- [ ] integration auth
- [ ] security checklist

## Completion Protocol

When all validation passes:

1. Set Status to `completed`
2. Update `docs/ards/STATUS.md`
3. Append notes to `docs/execution/progress-log.md`
4. Proceed to next unfinished ARD only via ard-to-code workflow
