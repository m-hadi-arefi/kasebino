# ADR-129 - ERPNext Data Synchronization Strategy

| Field | Value |
| --- | --- |
| ID | ADR-129 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract. Builds on ADR-036/109/126 outbox.

## Title

ERPNext Synchronization - Outbox, Idempotency, Retry, Reconciliation

## Context

ERPNext REST is eventually consistent relative to retail. Frappe lacks MOS-native idempotency for all DocTypes.

## Problem Statement

Sync must be durable and at-least-once without breaking POS or creating duplicate invoices.

## Goals

Define canonical sync pipeline, idempotency keys, retry/DLQ, and reconciliation posture.

## Non Goals

Implementing ERP HTTP calls; building full reconciliation UI.

## Decision

### Pipeline

```text
SaleCompleted (domain)
        |
        v
MerchantOS Outbox (same TX as OLTP mutation)
        |
        v
Integration Worker (`accounting_integration`)
        |
        v
AccountingProvider.recordSale
        |
        v
(future) ERPNext Sales Invoice + mapping row
```

Same pattern for Product/Customer/Payment/StockAdjusted -> provider methods.

### Rules

1. **Outbox pattern required** - never sync inside the retail DB transaction via HTTP.
2. **Idempotency:** provider methods key on `eventId` plus business ids (`saleId` / `idempotencyKey` / `paymentId`); mappings unique both directions.
3. **Retry:** existing outbox backoff; then DLQ; manual redrive.
4. **Reconciliation:** invariants in `reconciliation.md`; worker later; analytics not evidence.
5. **Ordering:** prefer causal local order per aggregate; do not require global ERP total order.
6. **E -> M** only via future ACL/webhooks (purchase receipts, balances) - never raw Desk writes into OLTP.

### Forbidden event shapes

- `eventType` = ERP DocType name
- Secrets / full PAN / PSP credentials in payloads

## Rationale

Matches proven SMS/PSP/MQTT worker model; survives ERP downtime.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| Sync HTTP in CompleteSale | Breaks offline + latency |
| Message bus rewrite (Kafka) | Out of Phase-1 monolith scope |
| CDC from Postgres to ERP | Fragile schema coupling |

## Consequences

Adapter must be idempotent. Ops must monitor `integration.event.*` metrics.

## Technical Impact

Uses existing outbox + `processed_events` + mappings; future adapter only.

## Implementation Requirements

- [x] Document pipeline in `event-contracts.md` / `erpnext-integration-model.md` / `reconciliation.md`
- [ ] Runtime adapter (deferred)

## Dependencies

ADR-036, ADR-037, ADR-109, ADR-126, ADR-127

## Related Documents

`docs/integrations/erpnext/event-contracts.md`

## Migration Plan

None.

## Testing Requirements

Fake provider idempotent replay; CompleteSale still co-writes outbox (ADR-126 tests).

## Iranian User Experience Requirements

N/A.

## Completion Criteria

- [x] Sync strategy documented
- [x] No sync-in-TX design accepted
