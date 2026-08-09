# ADR-143: Production Iranian PSP Gateway

| Field | Value |
| --- | --- |
| ID | ADR-143 |
| Status | `Proposed` |
| Date | 2026-08-09 |
| Origin | `docs/audit/` Critical #2; extends ADR-102 sandbox surface |
| Folder | `adrs/tasks/` |

## Status

Proposed — **blocked on human Accept of** `adrs/future/ADR-084-payment-psp.md` for vendor choice.

## Context

ADR-102 delivered payment HTTP + `SandboxPaymentGateway`. Online checkout cannot take real money. Audit: production Iranian PSP **MISSING**.

## Current State

- Port: `src/modules/payments/application/ports/payment-gateway.ts`
- Impl: `SandboxPaymentGateway` only (`payments/infrastructure/gateway/`)
- Composition always constructs sandbox (`create-api-context.ts` ~L403–423)
- HTTP: intents, webhooks, refunds, sandbox confirm (env-gated)
- Schema: `payments` table with `provider_ref`, idempotency
- Future vendor ADR: `adrs/future/ADR-084-payment-psp.md`

## Decision

After ADR-084 is Accepted, implement a production `PaymentGateway` adapter for the chosen Iranian PSP, selectable via env; keep sandbox for local/staging; never enable sandbox confirm in production.

## Scope

Included:

- Production gateway adapter + webhook verification
- Env wiring (`MOS_PAYMENT_PROVIDER`, secrets)
- Full-refund path via live provider
- Minimal settlement log fields if required by provider
- Staging soak checklist

Excluded:

- POS card terminal acquiring
- Partial refunds unless domain already supports
- Marketplace split payouts
- Fee charging (still 0 per pilot FEE_POLICY unless product changes)

## Technical Design

### Database

- Possibly: `payments.provider` enum string already present — verify; add `raw_webhook_events` only if idempotency needs durable payload store (prefer existing unique `provider_ref`).

### Backend

1. `ZaripalPaymentGateway` / chosen name under `payments/infrastructure/gateway/`.
2. Factory `createPaymentGateway()` parallel to accounting provider factory.
3. Webhook route already parameterized — implement HMAC/token rules per provider docs.
4. Production guards: reject sandbox confirm; require provider secrets when `MOS_ENV=production`.

### Frontend

- Storefront checkout: real redirect/return URLs; Persian failure/retry copy (uiuxpromax brief).
- Hide “simulate pay” outside local/dev.

### Infrastructure

- Secrets in deploy env only; document in `.env.example` placeholders.

## Implementation Plan

1. Human Accept ADR-084 (vendor + fees + settlement).
2. Implement adapter + unit tests with mocked HTTP.
3. Wire factory; staging dual-run alongside sandbox merchant flag if needed.
4. Refund soak; document reconciliation ops (MVP = daily desk check).

## Data Model Changes

Tables: none required for MVP  
Fields: confirm provider columns cover adapter needs  
Indexes: existing `payments_provider_ref_uq`  
Relations: payment → order already logical

## API Changes

Routes: same ADR-102 surface  
Request/Response: provider redirect URL fields already in intent responses — keep stable  
Webhook: `/api/v1/payments/webhooks/{provider}`

## Frontend Changes

Pages: storefront checkout return  
Components: payment status Persian states  
User flows: create intent → PSP → webhook/return → paid

## Testing Requirements

Unit: signature verify, idempotent webhook  
Integration: sandbox remains CI default  
E2E: staging against PSP sandbox/test merchant  
Manual: staging soak checklist

## Acceptance Criteria

- [ ] ADR-084 Accepted and referenced
- [ ] Production gateway selectable by env
- [ ] Sandbox confirm impossible when `MOS_ENV=production`
- [ ] Successful paid order via provider test credentials
- [ ] Invalid webhook rejected
- [ ] Refund updates payment + order per domain
- [ ] No secrets in client bundles

## Dependencies

Required before: ADR-084 Accepted (human), ADR-102 (done)  
Depends on: ADR-142 recommended before trusting inventory on paid  
Blocks: production online GMV

## Migration / Rollout Plan

1. Staging with test merchant mid.
2. Single pilot store production.
3. Monitor webhook failures via ADR-116 metrics.
