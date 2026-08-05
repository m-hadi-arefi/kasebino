# ADR-109 - Outbox Worker, Scheduled Jobs, and Live EMQX Publishing

| Field | Value |
| --- | --- |
| ID | ADR-109 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Outbox Worker, Scheduled Jobs, and Live EMQX Publishing

## Context

Transactional outbox schema + poller contracts exist; scheduled jobs return `stub_acknowledged`; EMQX client is URL stub; no `mqtt` dependency; no worker process in Compose.

## Problem Statement

Domain events never leave the process; pickup timers and loyalty expiry do not run; realtime and warehouse mirrors cannot work.

## Goals

- Long-running worker polls durable outbox, publishes to EMQX, marks processed (at-least-once + idempotency).
- Implement unpaid cancel (30m) and ready_for_pickup hold (24h) jobs (ADR-091).
- Implement loyalty points expiry job (ADR-099).
- DLQ/max-retry path persisted (not empty catch).

## Non Goals

- Exactly-once cross-service distribution.
- Replacing poll fallback on clients (ADR-124).

## Functional Requirements

- FR-1: Worker service in Compose depends on Postgres + EMQX.
- FR-2: Share transaction with OLTP writes for outbox insert (producers).
- FR-3: mqtt.js (or chosen) publisher adapter; topic naming ADR-037/038.
- FR-4: Scheduled job runners for pickup timers + loyalty expiry (not stubs).
- FR-5: Metrics for lag (ADR-116 hooks).

## Technical Design

1. Entrypoint e.g. `src/workers/outbox-worker.ts`.
2. Drizzle OutboxStore adapter (ADR-093).
3. Register notification + cache invalidation + warehouse consumers.
4. Cron/interval scheduler inside worker for policy timers.

## Database Changes

- Durable outbox/processed_events adapters; optional DLQ table if not present (migrate).

## Backend Changes

- Worker process; EMQX publisher; job implementations.

## Frontend Changes

- None directly (realtime UX ADR-124).

## Admin Changes

- Ops visibility via metrics later.

## API Changes

- None required.

## Security Considerations

- MQTT credentials via env secrets (ADR-068).
- Do not publish PII beyond event catalog allowances.

## Edge Cases

- Poison messages → DLQ after max retry.
- Clock skew on timer jobs - use DB time.
- Duplicate MQTT delivery - consumers idempotent.

## Acceptance Criteria

- [ ] Completing a sale appears on MQTT topic in Compose.
- [ ] Worker crash resumes without losing unprocessed outbox rows.
- [ ] Unpaid order auto-cancels after 30m in test with manipulated timestamps.
- [ ] Ready hold 24h path creates staff-actionable cancelled/expired state per policy.
- [ ] Loyalty expiry job publishes `PointsExpired` in test.

## Rollout Plan

1. Outbox publish path.
2. Timer jobs.
3. Additional consumers (notifications, cache, mongo).

## Dependencies

- ADR-035, ADR-037, ADR-038, ADR-091, ADR-093, ADR-099, ADR-108, ADR-110

## Risks

- Duplicate side effects without consumer idempotency.
- Worker single-point lag - scale later (ADR-071).

## Related Documents

- ADR-035, ADR-038
- ADR-091 timers
- `PRD.md` §11.5–11.6

## Iranian User Experience Requirements

- Persian copy for any merchant-visible timeout notifications.

## Estimated Complexity

**L**
