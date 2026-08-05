# ADR-112 - Readiness Probe `/api/ready`

| Field | Value |
| --- | --- |
| ID | ADR-112 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Readiness Probe `/api/ready`

## Context

`GET /api/health` returns `{ status: "ok" }` liveness only. Dockerfile/HEALTHCHECK and deploy need readiness separate from liveness (NFR deploy).

## Problem Statement

Load balancers cannot distinguish “process up” from “dependencies ready,” risking traffic to broken instances.

## Goals

- `/api/ready` checks Postgres + Redis (+ optional Mongo/EMQX) with short timeouts.
- Used by deploy/LB; unauthenticated; fail closed when DB down.

## Non Goals

- Deep synthetic business transactions in probe.
- Replacing `/api/health` liveness.

## Functional Requirements

- FR-1: Separate readiness from liveness.
- FR-2: Fast timeouts; 503 with component statuses when not ready.
- FR-3: No auth required.
- FR-4: Document Compose/k8s probe wiring (ADR-118).

## Technical Design

1. Route handler pings `SELECT 1` and Redis `PING`.
2. Optional checks gated by env flags.
3. Never throw unhandled - always JSON status.

## Database Changes

- None.

## Backend Changes

- `app/api/ready/route.ts` (+ shared probe helpers).

## Frontend Changes

- None.

## Admin Changes

- None.

## API Changes

- `GET /api/ready` → 200/503 JSON `{ status, checks: { postgres, redis, ... } }`

## Security Considerations

- Do not expose secrets/connection strings in response.
- Rate-limit lightly if needed to prevent abuse; keep probe cheap.

## Edge Cases

- Partial dependency outage (Redis down but DB up) - documented ready policy (recommend not-ready if cache-required paths critical; at minimum DB required).

## Acceptance Criteria

- [ ] `/api/health` remains cheap liveness.
- [ ] `/api/ready` returns 503 when Postgres unreachable.
- [ ] Checks complete within short timeout budget.
- [ ] Response contains no credentials.

## Rollout Plan

Wire into ADR-118 health/ready probes.

## Dependencies

- ADR-093 client, ADR-108 Redis client, ADR-118

## Risks

- Overly strict optional checks flapping readiness.

## Related Documents

- `PRD.md` NFR-03/deploy
- ADR-070 (future strategy) implemented via ADR-118

## Iranian User Experience Requirements

- N/A (ops endpoint). JSON keys may stay English for probes.

## Estimated Complexity

**S**
