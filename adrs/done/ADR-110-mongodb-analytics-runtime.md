# ADR-110 - MongoDB Analytics, Audit, Clickstream, and Warehouse Runtime

| Field | Value |
| --- | --- |
| ID | ADR-110 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

MongoDB Analytics, Audit, Clickstream, and Warehouse Runtime

## Context

Analytics plane contracts (ADR-056..065) are extensive; Mongo client is URL stub; no `mongodb` driver; admin audit/security pages are empty shells.

## Problem Statement

Audit, product analytics, clickstream/sessions, event warehouse, and conversion funnels cannot ingest; PA-* P0 requirements unmet.

## Goals

- Official MongoDB driver + adapters.
- Warehouse consumer from outbox; audit writers; clickstream/session beacons.
- TTL indexes per ADR-064; ingest failure never blocks POS (ADR-065).
- Conversion funnels: activation, POS capture, storefront (PA-06).

## Non Goals

- Mongo as OLTP SoT.
- Perfect BI warehouse beyond documented collections.

## Functional Requirements

- FR-1: Mirror domain events to event warehouse (PA-02).
- FR-2: Sensitive actions produce queryable audit records (PA-03).
- FR-3: Clickstream + session tracking for merchant app and storefront (PA-04).
- FR-4: Product analytics event ingest (PA-01).
- FR-5: Failure isolation after OLTP commit (PA-09).
- FR-6: Retention policies enforced (PA-10); tenant isolation on queries (PA-11).
- FR-7: correlationId continuity with logs (PA-12 / ADR-116).

## Technical Design

1. Add `mongodb` driver; implement client under `src/infrastructure/mongodb`.
2. Outbox consumer branch writes warehouse + audit projections.
3. HTTP beacons for clickstream/session (public/authenticated as designed).
4. Admin audit/security pages read APIs (ADR-106).

## Database Changes

- Mongo collections/indexes/TTL per architecture packages; not Postgres OLTP.

## Backend Changes

- Driver adapters; consumers; beacon endpoints; admin read APIs.

## Frontend Changes

- Instrument key funnels (storefront land with `src=qr`, POS capture, activation).
- Admin audit viewer live data.

## Admin Changes

- Audit log viewer; security signals fed by monitoring hooks.

## API Changes

- `/api/v1/telemetry/*` beacons
- `/api/v1/admin/audit` reads

## Security Considerations

- Phone scrubbing/masking in analytics/audit payloads.
- Never block checkout on Mongo errors.
- Tenant filters on all merchant analytics reads.

## Edge Cases

- Mongo outage buffer/drop policy documented.
- Oversized clickstream payloads rejected.

## Acceptance Criteria

- [ ] Sale event mirrored to warehouse collection.
- [ ] POS still succeeds if Mongo down.
- [ ] TTL indexes present on retention collections.
- [ ] Audit record created for admin suspend.
- [ ] QR land beacon includes `source=qr`.

## Rollout Plan

After ADR-109 outbox; wire beacons with storefront/POS UIs.

## Dependencies

- ADR-056–065, ADR-109, ADR-106, ADR-116

## Risks

- PII leakage; dual-write confusion for engineers (document boundaries).

## Related Documents

- `docs/product/analytics-requirements.md`
- ADR-014 boundaries

## Iranian User Experience Requirements

- Persian labels on admin analytics/audit UIs; Jalali display.

## Estimated Complexity

**L**
