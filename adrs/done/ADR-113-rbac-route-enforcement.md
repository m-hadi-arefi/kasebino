# ADR-113 - RBAC Authorization Enforcement at Routes and Use Cases

| Field | Value |
| --- | --- |
| ID | ADR-113 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

RBAC Authorization Enforcement at Routes and Use Cases

## Context

RBAC model + `authorize()` helpers exist and are tested; only admin use cases call them today. Middleware does not enforce roles; most modules trust caller-supplied tenant IDs.

## Problem Statement

Without enforcement, HTTP routes are unauthorized-access risks once APIs ship.

## Goals

- Mandatory authZ on all `/api/v1` merchant/admin routes.
- Derive tenant/store from JWT / server session context - never trust body `merchantId` alone.
- `platform_admin` for `/admin` APIs; audit admin actions.

## Non Goals

- Replacing the Accepted RBAC matrix (ADR-034) with a new model.
- External IdP/SSO.

## Functional Requirements

- FR-1: Deny by default.
- FR-2: `requirePermission()` (or equivalent) in application layer for mutations/reads.
- FR-3: Store-scoping for operational data.
- FR-4: Negative tests for cross-tenant and wrong-role access.
- FR-5: Admin actions audited.

## Technical Design

1. Bridge JWT → `AuthContext` (already sketched in identity authorization helpers).
2. Central helpers used by ADR-094 handlers and merchant/admin use cases.
3. Middleware may do coarse session presence; fine-grained checks in application layer.
4. Expand `authorize()` usage beyond admin module.

## Database Changes

- None.

## Backend Changes

- Wire authZ into use cases/handlers; remove header identity trusts.

## Frontend Changes

- Handle 401/403 Persian errors (ADR-028).

## Admin Changes

- Enforce platform_admin on all admin pages/APIs.

## API Changes

- Uniform 401/403 envelopes.

## Security Considerations

- Privilege escalation via store switcher must re-check membership/role.
- Log authZ denials without leaking sensitive data.

## Edge Cases

- User with multiple stores - active store header/cookie must be validated.
- Staff role cannot call admin activate/suspend.

## Acceptance Criteria

- [ ] Unauthenticated merchant API calls fail.
- [ ] Cross-tenant resource access denied in tests.
- [ ] Non-admin cannot call admin suspend.
- [ ] Admin suspend writes audit event.

## Rollout Plan

Land with ADR-094/095; audit all new routes against checklist.

## Dependencies

- ADR-034, ADR-095, ADR-094, ADR-106

## Risks

- Missing checks on “quick” routes during rapid feature delivery - add lint/checklist.

## Related Documents

- ADR-034, ADR-048, ADR-076

## Iranian User Experience Requirements

- Persian unauthorized/forbidden messages in UI.

## Estimated Complexity

**M**
