# ADR-119 - Security Hardening Runtime

| Field | Value |
| --- | --- |
| ID | ADR-119 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Security Hardening Runtime

## Context

ADR-076/077 contracts exist; runtime headers/CORS/CSP deferred; realtime token trusts `x-merchant-id`; staging OTP leak risk called out in ADR-095.

## Problem Statement

App is not production-hardened; open bypasses and missing headers violate NFR-04.

## Goals

- Secure headers (CSP/CORS/frame/etc.), CSRF strategy, HTTPS-only assumptions.
- Remove header identity bypasses.
- Pen-smoke checklist green for MVP.
- Ensure staging never returns `devOtp`; console SMS not default in prod.
- Outbox max-retry DLQ persistence (coordinate ADR-109).

## Non Goals

- Full paid pentest engagement (checklist/smoke only unless later commissioned).
- Rewriting Accepted security architecture docs.

## Functional Requirements

- FR-1: Helmet-equivalent headers on Next responses.
- FR-2: Strict CORS for known front origins.
- FR-3: CSRF protection for cookie session mutations.
- FR-4: Remove `x-merchant-id` trust on realtime token.
- FR-5: Regression tests for OTP non-leak in staging mode.
- FR-6: Pen-smoke doc with pass/fail evidence section.

## Technical Design

1. Next middleware/headers config.
2. Align with Auth.js cookie settings (ADR-095).
3. Security regression tests in Vitest/e2e.
4. Coordinate DLQ with worker ADR-109.

## Database Changes

- Optional DLQ table if introduced here vs ADR-109 - single owner: ADR-109.

## Backend Changes

- Headers/CORS/CSRF middleware; token authorizer fix.

## Frontend Changes

- Ensure clients send CSRF tokens if required.

## Admin Changes

- Admin routes included in pen-smoke.

## API Changes

- Behavior/headers; realtime token auth requirements.

## Security Considerations

- This ADR is the runtime enforcement layer for ADR-076/077.
- Threat model: OTP abuse, tenant confuse-proxy, XSS on storefront.

## Edge Cases

- Embedded storefront vs same-origin assumptions for CORS.
- Preview deployments origins allowlist.

## Acceptance Criteria

- [ ] Security headers present on HTML/API responses in staging.
- [ ] Realtime token rejects header-only identity.
- [ ] Staging OTP responses never include code.
- [ ] Pen-smoke checklist checked in with results for last run.
- [ ] CSRF mutation without token fails.

## Rollout Plan

Land before public staging; re-run pen-smoke after major auth changes.

## Dependencies

- ADR-076, ADR-077, ADR-095, ADR-108, ADR-109, ADR-113

## Risks

- CSP breaking inline scripts - prefer Next defaults + nonces.

## Related Documents

- `PRD.md` §14, NFR-04
- ADR-076/077

## Iranian User Experience Requirements

- Security error copy in Persian on user surfaces.

## Estimated Complexity

**M**
