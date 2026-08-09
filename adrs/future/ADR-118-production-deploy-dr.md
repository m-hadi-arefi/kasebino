# ADR-118 - Zero-Downtime Deploy, Staging, Backup, and DR

| Field | Value |
| --- | --- |
| ID | ADR-118 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05; reconfirmed `docs/audit/production-readiness.md` |
| Folder | `adrs/tasks/` (promoted from `future/` 2026-08-09) |

## Status

`Proposed` — implementation queue. Tracking: `adrs/STATUS.md`.

## Title

Zero-Downtime Deploy, Staging, Backup, and DR

## Context

ADR-070..073 Accepted in future/ not implemented; CI validates/builds but no CD; no automated backups; no staging environment runbook.

## Problem Statement

Cannot safely ship to staging/production with NFR-02/03; no DR story for Postgres/MinIO/Mongo.

## Goals

- CD pipeline to staging (and prod when ready).
- Rolling/zero-downtime deploy with ≥2 app instances behind LB.
- migrate-before-traffic job; health + ready probes (ADR-112).
- Backups for Postgres/MinIO/Mongo + restore drill documentation.

## Non Goals

- Multi-region active-active in MVP.
- Changing local Compose developer workflow beyond documenting prod topology.

## Functional Requirements

- FR-1: Staging environment with secrets via GitHub Environments (or chosen host).
- FR-2: Zero-downtime strategy implemented for chosen orchestrator.
- FR-3: Expand/contract-safe migrations process.
- FR-4: Backup schedules + quarterly restore drill checklist.
- FR-5: Horizontally scalable stateless app instances.

## Technical Design

1. Choose initial target (Compose prod-like or k8s) and document in ops runbook.
2. Wire CD from CI artifacts.
3. Backup cron for data plane volumes/snapshots.
4. Implements runtime of ADR-070..073 without editing `adrs/future` files.

## Database Changes

- Ops only; migration apply automation.

## Backend Changes

- Config/secret loading verified for staging/prod.

## Frontend Changes

- None.

## Admin Changes

- None.

## API Changes

- Probe endpoints used by LB.

## Security Considerations

- Secrets never in git; least privilege deploy roles.
- Backup encryption at rest where supported.

## Edge Cases

- Failed migration mid-deploy - rollback runbook.
- Ready flap during dependency blip - retry thresholds.

## Acceptance Criteria

- [ ] Staging deploy from main/CI succeeds.
- [ ] LB uses `/api/ready` and `/api/health` distinctly.
- [ ] Documented backup + restore drill executed once in staging.
- [ ] ≥2 app instances configuration documented/deployed.

## Rollout Plan

Staging first → production after SMS/PSP/security gates.

## Dependencies

- ADR-066–069, ADR-112, ADR-116, ADR-119
- ADR-070–073 future accepted

## Risks

- Under-documented host choice causes thrash - decide early in ADR notes during impl.

## Related Documents

- `PRD.md` §16
- ADR-068 secrets

## Iranian User Experience Requirements

- N/A directly; staging seed data should use Persian sample content.

## Estimated Complexity

**XL**
