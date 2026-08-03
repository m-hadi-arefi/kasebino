# ARD-026 — Security Monitoring

| Field | Value |
| --- | --- |
| ID | ARD-026 |
| Title | Security Monitoring |
| Status | `todo` |
| Milestone | M5 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | analytics-requirements.md + ADM-02/03 |

## Objective

Implement security monitoring signals from auth, rate limits, admin actions, and anomaly hooks; persist in MongoDB; alert via EMQX admin topics.

## Business Value

Reduce fraud/abuse impact and satisfy admin monitoring requirements.

## Requirements

- PA-08, ADM-02, ADM-03

## Dependencies

- ARD-021, ARD-022
- ARD-002, ARD-015, ARD-018

## Architecture

Signal writers + simple rules engine (batch MVP); `mos_security` collections; alert publisher to `mos/{env}/admin/monitoring`.

## Domain Model

Security signal documents/rules config — not OLTP aggregates.

## API Contracts

| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/security/signals` |
| GET | `/api/v1/admin/security/alerts` |

## Events

- `RateLimitTriggered`
- `AuthOtpFailed`
- `SuspiciousAccessPattern`
- `AdminMerchantSuspended`

## Persistence Strategy

### PostgreSQL + Drizzle

Optional reads of merchant status; not primary signal store.

### MongoDB

`mos_security` signals + alerts; TTL per retention doc.

## Database Design

Indexes: `type+occurredAt`, `merchantId+occurredAt`, `severity+occurredAt`.

### Caching Plan

Short TTL for alert boards.

## Security

Strict `platform_admin`; viewing security data audited.

## Analytics / Audit / Tracking Requirements

- Analytics: signal volumes
- Audit: all admin security actions + view access
- Tracking: N/A
- Metrics: OTP fail rate, rate-limit spikes, open alerts

## UI Requirements

- **uiuxpromax REQUIRED** for signals/alerts lists

## Testing

Signal emission on simulated OTP failures / rate limits.

## Acceptance Criteria

- [ ] OTP failure spikes raise signals
- [ ] Rate limit triggers recorded
- [ ] Admin alert channel/topic wired
- [ ] Event/metric lists documented

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

Global DoD + security-monitoring-architecture.

## Implementation Checklist

- [ ] Read security/audit/mongodb/observability architectures
- [ ] Signal writers + rules
- [ ] Admin UI
- [ ] Tests + STATUS

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] lint / typecheck / tests
- [ ] security checklist items related to monitoring

## Completion Protocol

Update STATUS + progress-log.
