# ARD-028 — Observability & Monitoring

| Field | Value |
| --- | --- |
| ID | ARD-028 |
| Title | Observability & Monitoring |
| Status | `todo` |
| Milestone | M5 |
| Owner | AI via ard-to-code |
| Last updated | 2026-08-03 |
| Source | NFR-05 + PA-12 |

## Objective

Unify observability with analytics correlation: structured logs, OpenTelemetry traces/metrics, health/ready including Mongo degradation policy, golden signals, and runbooks linking audit/security signals. Complements ARD-020 hardening.

## Business Value

Reliable operations and faster incident response across OLTP and analytics pipelines.

## Requirements

- PA-12, NFR-05
- Overlaps ARD-020 (coordinate; do not duplicate landing/Lighthouse work)

## Dependencies

- ARD-001
- ARD-021
- Parallel with ARD-020

## Architecture

Extend `10-observability-architecture.md`: propagate `correlationId` request → outbox → warehouse; metrics for ingest lag, Mongo errors, OTP, checkout; ready probe documents Mongo optional degradation.

## Domain Model

N/A

## API Contracts

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | existing |
| GET | `/api/ready` | include Mongo policy |

## Events

- Ops metrics are not domain events; may emit ops notices to admin monitoring topic

## Persistence Strategy

### PostgreSQL + Drizzle

N/A beyond existing.

### MongoDB

Health check only; traces default to OTel backend, not Mongo.

## Database Design

N/A

### Caching Plan

N/A

## Security

No PII in traces/logs; scrubbers required.

## Analytics / Audit / Tracking Requirements

- Analytics metrics: mirror lag, ingest errors
- Audit: N/A
- Tracking: N/A
- Dashboard metrics: golden signals list in observability doc

## UI Requirements

- No product UI (ops consoles external)

## Testing

correlationId propagation test plan; ready degraded mode documented.

## Acceptance Criteria

- [ ] `correlationId` present across request→outbox→warehouse path
- [ ] Golden signals documented and exportable
- [ ] Ready policy documents Mongo degradation mode
- [ ] Runbooks link security/audit signals

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
- Reports: Persian labels + Jalali/`Asia/Tehran` buckets for humans.

## Iranian User Considerations

- Iranian mobile numbers and SMS OTP patterns when identity involved.
- Workflows match local retail (POS rush, QR, pickup) — not Western delivery ecommerce.
- Mobile-first Android usability and modest bandwidth.
- Pass `docs/checklists/iranian-feature-checklist.md` before completion.

## Definition of Done

Must pass **Iranian feature checklist** (`docs/checklists/iranian-feature-checklist.md`) for any user-facing scope.

Global DoD + observability architecture + ARD-028 acceptances.

## Implementation Checklist

- [ ] Read observability/analytics/mongodb/audit/security docs
- [ ] Metric catalog documentation
- [ ] OTel wiring checklist
- [ ] Runbooks under docs/observability/
- [ ] STATUS update

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ] RTL + Persian copy reviewed for in-scope screens
- [ ] lint / typecheck / tests
- [ ] PII scrub review

## Completion Protocol

Update STATUS + progress-log.
