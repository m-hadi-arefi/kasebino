# ADR-107 - Notifications Center Runtime

| Field | Value |
| --- | --- |
| ID | ADR-107 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Notifications Center Runtime

## Context

Notifications module + outbox handler factory + mock/console SMS channels exist; no merchant/customer notifications UI or list APIs.

## Problem Statement

Users cannot see in-app notifications for orders, loyalty, or system events; SMS OTP templates are not centralized for production.

## Goals

- Persist and list in-app notifications per audience.
- Mark read; optional realtime badge updates.
- Reuse channel ports for OTP/SMS (production SMS via ADR-115).

## Non Goals

- Full marketing campaign builder.
- Push via FCM/APNs in MVP unless already contracted.

## Functional Requirements

- FR-1: Create notification from domain envelope/outbox handler.
- FR-2: List + markRead APIs for merchant staff and customer portal.
- FR-3: Persian notification titles/bodies.
- FR-4: Wire outbox consumer path (ADR-109) to notification creator.

## Technical Design

1. Drizzle notification repository (ADR-093).
2. UI drawer/page under merchant shell + customer portal.
3. Outbox handler already sketched - register in worker.

## Database Changes

- Uses `notifications` table.

## Backend Changes

- Notification APIs; worker handler registration.

## Frontend Changes

- Notifications center UI (Persian RTL unread/read).

## Admin Changes

- Optional platform alerts later; not required for MVP center.

## API Changes

- `/api/v1/notifications`, mark-read endpoint

## Security Considerations

- Audience + tenant scoped lists only.
- No sensitive secrets in notification payloads.

## Edge Cases

- High-volume spam - retention/TTL coordination with ADR-064/110.
- Duplicate outbox delivery → idempotent create.

## Acceptance Criteria

- [ ] Completing a relevant domain event produces an in-app notification row.
- [ ] User can list and mark read.
- [ ] Cross-tenant leak tests pass.

## Rollout Plan

After outbox worker (ADR-109) and auth sessions.

## Dependencies

- ADR-090, ADR-093, ADR-094, ADR-095, ADR-109, ADR-114, ADR-115

## Risks

- Notification noise degrading UX - keep MVP templates minimal.

## Related Documents

- ADR-090
- `PRD.md` realtime notification mentions

## Iranian User Experience Requirements

- Persian titles/bodies; RTL center; Jalali timestamps.

## Estimated Complexity

**M**
