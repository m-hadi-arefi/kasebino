# ADR-115 - Accept Iranian SMS Provider and Production Adapter

| Field | Value |
| --- | --- |
| ID | ADR-115 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05; reconfirmed `docs/audit/` 2026-08-09 Critical #3 |
| Folder | `adrs/tasks/` (promoted from `future/` 2026-08-09) |

## Status

`Proposed` — implementation queue. Blocked on human Accept of `adrs/future/ADR-083-sms-provider.md`. Tracking: `adrs/STATUS.md`.

## Title

Accept Iranian SMS Provider and Production Adapter

## Context

ADR-083 remains Proposed in `adrs/future/`. Only mock/console SMS adapters exist. AUTH-04 requires real SMS in production.

## Problem Statement

Production OTP delivery is blocked; Kerman pilot cannot onboard real merchants/customers.

## Goals

- Human accepts provider choice (update ADR-083; do not rewrite future file from this task beyond referencing it).
- Implement production `SmsPort` adapter with env secrets.
- Persian OTP templates; deliverability metrics; never return OTP in production JSON.

## Non Goals

- Replacing phone-OTP with email.
- Marketing blast SMS product.

## Functional Requirements

- FR-1: Production adapter for Accepted provider.
- FR-2: Feature-flag provider; console/mock only for local.
- FR-3: Rate limits remain enforced (ADR-108).
- FR-4: Failover/runbook documented.
- FR-5: Metrics on send failures (ADR-116).

## Technical Design

1. Blocked on human Accept of ADR-083 - until then keep ports + sandbox.
2. After Accept: implement adapter module; wire composition by `SMS_PROVIDER` env.
3. Shared Persian templates for merchant and customer OTP.
4. Timeout/retry with idempotent provider request ids when supported.

## Database Changes

- None required (OTP challenges already persisted).

## Backend Changes

- Production SMS adapter; composition switch; remove accidental prod console default.

## Frontend Changes

- UX copy when SMS fails (Persian retry guidance).

## Admin Changes

- Optional delivery failure signal in security/ops views.

## API Changes

- Behavior only on OTP endpoints (no OTP field in prod responses).

## Security Considerations

- Secrets in env only.
- Provider webhooks (if any) authenticated.
- PII minimization in provider logs.

## Edge Cases

- Provider outage → clear Persian error; do not leak OTP.
- International numbers rejected (Iranian MSISDN only for MVP).

## Acceptance Criteria

- [ ] ADR-083 Accepted (human) before prod adapter enabled.
- [ ] Staging/production never return OTP in JSON.
- [ ] Successful OTP SMS send in staging with test numbers.
- [ ] Console adapter cannot be selected when `NODE_ENV=production`.

## Rollout Plan

Local/mock → staging provider → production.

## Dependencies

- ADR-083 (future/Proposed), ADR-031, ADR-032, ADR-095, ADR-103, ADR-108, ADR-116

## Risks

- Provider selection delay blocks go-live - keep mock for coding, gate launch.

## Related Documents

- `adrs/future/ADR-083-sms-provider.md`
- `PRD.md` AUTH-03/04
- `docs/product/risks.md` R2

## Iranian User Experience Requirements

- Persian OTP SMS text; Iranian numbers only.
- Clear UI when SMS delayed.

## Estimated Complexity

**M** (plus human vendor decision)
