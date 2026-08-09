# ADR-116 - Structured Logging, Metrics, Tracing, and Alerting Runtime

| Field | Value |
| --- | --- |
| ID | ADR-116 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05; reconfirmed `docs/audit/` Ops score 42 |
| Folder | `adrs/tasks/` (promoted from `future/` 2026-08-09) |

## Status

`Proposed` — implementation queue. Tracking: `adrs/STATUS.md`.

## Title

Structured Logging, Metrics, Tracing, and Alerting Runtime

## Context

ADR-074/075 Accepted in `future/` with no implementation. No OpenTelemetry, metrics backend, or alert rules. NFR-05 unmet.

## Problem Statement

Production incidents cannot be diagnosed; outbox lag and OTP/POS failures lack actionable signals.

## Goals

- Structured JSON logs, RED metrics, OTEL-ready traces, error monitoring.
- Alert runbooks for POS errors, OTP failures, outbox lag, 5xx.
- Correlate logs/traces with analytics `correlationId` (PA-12).

## Non Goals

- Building a full custom observability SaaS.
- Logging raw OTPs or full card data (none expected).

## Functional Requirements

- FR-1: Structured logger with correlationId on requests/workers.
- FR-2: Metrics for request rate/errors/duration; outbox lag gauge.
- FR-3: OTEL instrumentation hooks on route handlers + worker.
- FR-4: Error monitoring integration (choose supported vendor/self-host; document).
- FR-5: PII scrubbing for phones in logs.
- FR-6: Alert definitions documented and wired where possible.

## Technical Design

1. Add logging + OTEL SDKs appropriate for Next.js + worker.
2. Instrument ADR-094 handlers and ADR-109 worker.
3. Export to chosen backend; provide local stdout JSON default.
4. Implements runtime of ADR-074/075 without modifying `adrs/future` files beyond reference.

## Database Changes

- None.

## Backend Changes

- Shared telemetry module; wire app + worker.

## Frontend Changes

- Optional client error boundary reporting (ADR-028 alignment).

## Admin Changes

- Ops dashboards external; optional admin links later.

## API Changes

- None (headers may include correlation id echo).

## Security Considerations

- Scrub PII; no secrets in logs.
- Restrict metrics endpoint if exposed.

## Edge Cases

- High cardinality labels (avoid raw storeSlug explosion).
- Worker without HTTP request context - generate correlation ids.

## Acceptance Criteria

- [ ] JSON logs include correlationId for a sample API call.
- [ ] Outbox lag metric visible in local/staging exporter.
- [ ] Phones scrubbed in log fixtures/tests.
- [ ] Alert runbook markdown committed for POS/OTP/outbox/5xx.

## Rollout Plan

Local stdout → staging exporter → production alerts.

## Dependencies

- ADR-074/075 (future accepted), ADR-109, ADR-110, ADR-118

## Risks

- Next.js instrumentation constraints - document supported paths.

## Related Documents

- `PRD.md` NFR-05, §15
- `docs/product/analytics-requirements.md` PA-12

## Iranian User Experience Requirements

- Merchant-facing error pages remain Persian; ops tooling may be English.

## Estimated Complexity

**L**
