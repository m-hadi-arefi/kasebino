# ADR-099 - Loyalty Points, Rewards, Coupons, Wallet Runtime

| Field | Value |
| --- | --- |
| ID | ADR-099 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Loyalty Points, Rewards, Coupons, Wallet Runtime

## Context

LYL-01..04 are P0. Domain + schemas exist; expiry job is `stub_acknowledged` in outbox; customer wallet pages are empty shells.

## Problem Statement

No production earn/redeem/expire path; wallets not visible to merchants or customers; growth loop cannot run.

## Goals

- Configurable earn rules (default 100,000 IRR = 1 point; 12-month expiry from last earn per ADR-091).
- POS redeem + coupon redeem; customer-visible wallet.
- Emit `PointsEarned` / `PointsRedeemed` / `PointsExpired`.

## Non Goals

- Cross-store global wallet.
- Complex tier programs / gamification.
- Marketing campaign automation (future).

## Functional Requirements

- FR-1: Merchant configures point rules per store (LYL-01).
- FR-2: Completing POS sale / paid pickup order earns per rule (LYL-02 events).
- FR-3: Rewards/coupons create + redeem at POS (LYL-03).
- FR-4: Wallet balance visible to merchant CRM and customer portal (LYL-04).
- FR-5: Scheduled expiry job (via ADR-109 workers) posts `PointsExpired`.

## Technical Design

1. Ledger-based wallet (append-only points ledger).
2. Ports into POS CompleteSale and order paid handlers.
3. Merchant loyalty settings UI + CRM wallet display.
4. Customer portal wallet reads (ADR-103).
5. Expiry scanner job configurable per store (disable allowed).

## Database Changes

- Uses `point_rules`, `wallets`, `points_ledger`, `coupons` via ADR-093.

## Backend Changes

- Drizzle loyalty repos; earn/redeem use cases wired; expiry job implementation (not stub).

## Frontend Changes

- Merchant loyalty config UI; POS redeem controls; customer wallet live data.

## Admin Changes

- None required for MVP.

## API Changes

- `/api/v1/loyalty/rules`, `/wallets/{membershipId}`, redeem + coupon endpoints.

## Security Considerations

- Redeem only for membership belonging to active store.
- Prevent double-redeem with idempotency / ledger constraints.

## Edge Cases

- Zero/negative cart after redeem.
- Expiry when no earn ever occurred.
- Rule change mid-day - apply rule version at earn time.

## Acceptance Criteria

- [ ] Completing a sale awards points per configured rule.
- [ ] Redeem decreases wallet and publishes redeem event.
- [ ] Expiry job removes expired points and publishes `PointsExpired`.
- [ ] Customer portal shows balance for that store membership only.

## Rollout Plan

Enable earn after POS/order paths persist; ship customer visibility with ADR-103.

## Dependencies

- ADR-010, ADR-091, ADR-093, ADR-094, ADR-096, ADR-098, ADR-100, ADR-103, ADR-109

## Risks

- Ledger inconsistency under concurrent redeem.
- Job backlog on large memberships.

## Related Documents

- `PRD.md` LYL-*
- `docs/product/growth-loops-loyalty.md`

## Iranian User Experience Requirements

- تومان / points labels in Persian; RTL wallet UI.
- Jalali earn/expiry dates on statements.

## Estimated Complexity

**L**
