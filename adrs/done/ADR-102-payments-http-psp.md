# ADR-102 - Payments HTTP Surface and PSP Integration Path

| Field | Value |
| --- | --- |
| ID | ADR-102 |
| Status | `Proposed` |
| Date | 2026-08-05 |
| Origin | Release-readiness audit 2026-08-05 (docs/product vs codebase) |
| Folder | `adrs/tasks/` |

## Status

`Proposed` - Implementation-ready runtime gap ADR. Tracking: `adrs/STATUS.md`.

## Title

Payments HTTP Surface and PSP Integration Path

## Context

Payment domain + sandbox gateway exist; no HTTP intent/webhook routes; ADR-084 (PSP selection) remains Proposed/future. Online pickup requires payable flow.

## Problem Statement

Customers cannot pay for pickup orders; merchants cannot receive `paid` orders without a payment HTTP path.

## Goals

- HTTP APIs for create intent, sandbox confirm, webhook verify, refund initiation.
- Sandbox/mock usable until ADR-084 Accepted; port-stable for production adapter swap.
- Mark order paid only after verified payment success.

## Non Goals

- Selecting/accepting final Iranian PSP inside this ADR (human accepts ADR-084).
- Card acquiring for in-store POS tenders.
- Transaction fee charging during free Kerman pilot (instrument only).

## Functional Requirements

- FR-1: Create payment intent for pickup order.
- FR-2: Sandbox confirm path for local/staging demos.
- FR-3: Webhook verification (HMAC/sandbox secret) → mark paid.
- FR-4: Refund payment use case callable from merchant refund action.
- FR-5: Idempotent webhook handling.

## Technical Design

1. Expose `/api/v1/payments/*` calling payments module use cases.
2. Keep `PaymentGateway` port; `SandboxPaymentGateway` default until ADR-084.
3. On success, call ordering `markPaid` in same consistency model (transaction + outbox).
4. Never trust client “I paid” without gateway/webhook verification.

## Database Changes

- Uses `payments` table via ADR-093.

## Backend Changes

- Payment route handlers; webhook auth; DI for gateway adapter.

## Frontend Changes

- Storefront checkout redirect/return UX (Persian) - with ADR-100.
- Sandbox “simulate pay” control only in non-production.

## Admin Changes

- Optional payment failure visibility later; not MVP blocker.

## API Changes

- `POST /api/v1/payments/intents`
- `POST /api/v1/payments/webhooks/{provider}`
- `POST /api/v1/payments/{id}/refunds`
- Dev-only sandbox confirm endpoint guarded by env flag

## Security Considerations

- Verify webhook signatures; reject replayed events.
- No secret leakage to client.
- Restrict sandbox confirm to local/dev.

## Edge Cases

- Double webhook delivery.
- Pay after unpaid auto-cancel.
- Partial refund policies (define MVP = full refund only unless domain already supports partial).

## Acceptance Criteria

- [ ] Pickup order can move to `paid` via sandbox path end-to-end.
- [ ] Invalid webhook signature rejected.
- [ ] Refund use case updates payment + order per domain rules.
- [ ] Production adapter slot documented; swap does not change HTTP shape.

## Rollout Plan

1. Sandbox HTTP + storefront return URLs.
2. After ADR-084 Accepted, implement provider adapter (may extend this ADR or follow-up).

## Dependencies

- ADR-012, ADR-084 (vendor), ADR-093, ADR-094, ADR-100, ADR-101
- ADR-115 independent

## Risks

- Vendor ADR still Proposed blocks true production charges.
- Webhook clock skew / retries.

## Related Documents

- `PRD.md` payments / online orders
- ADR-091 pilot free + sandbox until PSP accepted
- `adrs/future/ADR-084-payment-psp.md`

## Iranian User Experience Requirements

- Persian checkout payment states; تومان amounts.
- Clear failure/retry copy for Iranian mobile browsers.

## Estimated Complexity

**L**
