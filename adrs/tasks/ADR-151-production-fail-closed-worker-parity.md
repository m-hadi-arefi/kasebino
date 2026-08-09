# ADR-151: Production Fail-Closed Guards and Worker Compose Parity

| Field | Value |
| --- | --- |
| ID | ADR-151 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Medium #13 + production stubs |
| Folder | `adrs/tasks/` |

## Status

Proposed

## Context

Several “safe local defaults” become dangerous if promoted unchanged: accounting noop, Fake finance reader, sandbox payments, inventory stubs, worker Compose missing MinIO env (receipts fall to memory). Production readiness score Ops 42.

## Current State

- Guards already: SMS console policy, sandbox payment ack (`production-guards.ts`)
- Missing: inventory stub boot fail; finance Fake forbidden in prod; worker MinIO env in Compose profile
- Worker: `docker-compose.yml` worker service depends postgres/redis/emqx; Mongo URL set inconsistently vs MinIO
- Default `.env.example`: `MOS_ACCOUNTING_PROVIDER=noop`

## Decision

Centralize production fail-closed checks in composition boot:

1. Reject inventory stubs in production (pairs ADR-142).
2. Reject FakeFinanceReader / noop accounting when `MOS_REQUIRE_ERPNEXT=1` or when finance features advertised — at minimum reject Fake in production.
3. Align worker Compose with `MINIO_*` (+ document accounting env).
4. Ready probe reflects worker-critical dependencies when flags set.

## Scope

Included:

- `assertProductionIntegrationPolicy(env)` extensions
- Compose worker env parity
- Docs runbook updates

Excluded:

- Full observability (ADR-116)
- CD/DR (ADR-118)
- Forcing ERPNext for every deploy (optional flag)

## Technical Design

### Backend

- Extend `src/infrastructure/composition/production-guards.ts`
- Unit tests for each guard matrix

### Infrastructure

- `docker-compose.yml` worker environment: `MINIO_ENDPOINT`, keys, bucket
- Document `MOS_ACCOUNTING_PROVIDER` for staging

### Security

- Prevent silent degradation that looks healthy on `/api/health` while receipts disappear

## Implementation Plan

1. Inventory + finance guards.
2. Compose parity.
3. Ready check optional requires.
4. Tests + docs.

## Data Model Changes

None

## API Changes

Behavior on boot / `/api/ready` only

## Frontend Changes

None

## Testing Requirements

Unit: guard matrix  
Compose smoke: worker receives MinIO env (parity test extend `docker-compose-parity`)

## Acceptance Criteria

- [ ] Production boot fails on inventory stubs
- [ ] Production boot fails on Fake finance reader
- [ ] Worker Compose includes MinIO vars
- [ ] docs/audit ops notes updated
- [ ] Local remaining degraded modes documented

## Dependencies

Required before: ADR-142 for real inventory ports  
Pairs: ADR-146 finance honesty  
Depends on: existing production-guards

## Migration / Rollout Plan

Ship guards after ADR-142 wiring so staging can actually boot.
