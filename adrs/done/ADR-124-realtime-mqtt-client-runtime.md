# ADR-124 - Realtime MQTT Client Subscriptions for Merchant Surfaces

| Field | Value |
| --- | --- |
| ID | ADR-124 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Realtime MQTT Client Subscriptions for Merchant Surfaces

## Context

ADR-039 defines MQTT client strategy with poll fallback; server publish path is ADR-109. `POST /api/v1/realtime/token` exists but is stub-authorized. Merchant POS, pickup board, and dashboards lack live client subscriptions.

## Problem Statement

Even with server-side MQTT publish, merchants will not receive realtime inventory/sales/order updates without a browser client runtime and safe token minting.

## Goals

- Authenticated realtime token mint (no header identity bypass).
- Merchant staff client subscribes to store-scoped topics for inventory, sales, orders, notifications.
- Poll fallback when MQTT unavailable (ADR-039).
- Admin realtime monitoring hooks optional/P1 (ADM-03) if time permits after merchant path.

## Non Goals

- Customer storefront mandatory MQTT (poll OK for MVP).
- Replacing HTTP APIs with MQTT commands.

## Functional Requirements

- FR-1: Token endpoint requires valid merchant session; scopes to active store.
- FR-2: Client library/hook connects to EMQX over WebSocket/MQTT.js.
- FR-3: Pickup board + POS soft-refresh on relevant events.
- FR-4: Automatic fallback polling intervals documented and implemented.
- FR-5: Topic names comply with ADR-037/038.

## Technical Design

1. Fix token route auth via ADR-095/113.
2. Shared `useRealtimeStoreChannel` (name flexible) in staff app.
3. Compose EMQX WS URL from public env.
4. Integrate into ADR-101 board and ADR-096/107 as needed.

## Database Changes

- None.

## Backend Changes

- Harden token API; optionally ACL token claims for topics.

## Frontend Changes

- Staff realtime hook + wiring on board/POS/notifications badge.

## Admin Changes

- Optional ADM-03 subscribe path after merchant path stable.

## API Changes

- `POST /api/v1/realtime/token` hardened contract.

## Security Considerations

- Short-lived tokens; store-scoped topic ACL.
- No tenant topic wildcards for clients.
- Remove `x-merchant-id` trust (ADR-119).

## Edge Cases

- Token expiry mid-session - silent renew.
- EMQX down - fallback poll without user-visible hard failure.
- Multiple tabs - avoid stampede (shared worker optional later).

## Acceptance Criteria

- [ ] Authenticated staff receives order-created event on board without manual refresh (Compose EMQX).
- [ ] Unauthenticated token request fails.
- [ ] Poll fallback updates board when MQTT disabled in test flag.
- [ ] Cross-store topic access denied.

## Rollout Plan

After ADR-109 publish + ADR-095 auth; enable on pickup board first.

## Dependencies

- ADR-038, ADR-039, ADR-095, ADR-101, ADR-109, ADR-113, ADR-119

## Risks

- Browser MQTT TLS/WS issues behind reverse proxies - document WS path.

## Related Documents

- `PRD.md` §11.5
- ADR-039

## Iranian User Experience Requirements

- Persian toasts for “سفارش جدید” etc.; RTL UI chrome.

## Estimated Complexity

**M**
