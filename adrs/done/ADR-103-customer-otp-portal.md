# ADR-103 - Customer SMS OTP and Membership Portal

| Field | Value |
| --- | --- |
| ID | ADR-103 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Customer SMS OTP and Membership Portal

## Context

CUST-01..03 are P0. Customer OTP use cases + mock SMS exist; portal pages under `/s/.../dashboard` are stubs; JWT unwired. Explicit consent checkbox required before OTP (ADR-091).

## Problem Statement

Customers cannot login or see points, history, rewards, or receipts in store context.

## Goals

- Customer OTP login with consent checkbox.
- Membership-scoped portal: profile, points/wallet, purchase history, rewards, receipts, orders.
- Separate customer audience JWT (no merchant session bleed).

## Non Goals

- Cross-store unified customer homepage marketplace.
- Production SMS provider (ADR-115).

## Functional Requirements

- FR-1: Customer phone OTP login/registration (CUST-01).
- FR-2: Profile in store membership context (CUST-02).
- FR-3: View points, purchase history, rewards, receipts (CUST-03).
- FR-4: Explicit Persian consent checkbox before OTP send/verify.
- FR-5: Join/link membership for current store on successful auth.

## Technical Design

1. Wire customer OTP routes + Auth.js customer session (ADR-095 foundation).
2. Portal pages fetch membership-scoped APIs only.
3. Receipts link to MinIO/signed URLs when ADR-111 lands (graceful empty otherwise).
4. uiuxpromax for portal flows.

## Database Changes

- Customer identities/OTP + memberships via ADR-093.

## Backend Changes

- Customer auth handlers; portal read APIs for wallet/orders/sales/receipts/rewards.

## Frontend Changes

- OTP UI with consent checkbox; live portal pages replacing empty shells.
- Persian RTL; Jalali dates; تومان.

## Admin Changes

- None.

## API Changes

- `/api/v1/auth/customer/otp/*`
- `/api/v1/storefront/{slug}/me/*` portal resources

## Security Considerations

- Audience isolation from merchant JWT.
- Never return OTP in staging/production.
- Store-scoped authorization on every portal read.

## Edge Cases

- Customer with no membership yet → create on consent+OTP.
- Soft-deleted membership rejoin policy.
- Session on store A must not read store B.

## Acceptance Criteria

- [ ] OTP login works in dev with returned code when allow-flag set.
- [ ] Consent checkbox required; verify blocked without it.
- [ ] Portal shows live wallet/orders for that store membership.
- [ ] Logout clears customer session.
- [ ] Cross-store data bleed tests pass.

## Rollout Plan

After ADR-095 customer audience support; enrich with ADR-099/100/111 data.

## Dependencies

- ADR-032, ADR-033, ADR-091, ADR-093, ADR-094, ADR-095, ADR-098, ADR-099, ADR-100, ADR-114

## Risks

- Audience confusion with merchant cookies.
- Empty portal if loyalty/orders not yet wired - show honest empty states.

## Related Documents

- `PRD.md` CUST-*
- `docs/product/user-journeys.md` J5
- ADR-087 customer dashboard architecture

## Iranian User Experience Requirements

- Persian + RTL portal; Iranian phone; explicit consent copy.
- uiuxpromax before UI.
- Iranian feature checklist.

## Estimated Complexity

**L**
