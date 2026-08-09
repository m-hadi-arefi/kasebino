# Reconciliation Design (Future)

No full reconciliation engine in this phase. Define invariants for a later worker/UI.

## Invariants

1. Every completed MOS sale with outbox `SaleCompleted` published should eventually have an `external_entity_mappings` row for `(provider, entity_type=sale, entity_id=saleId)` **or** a durable dead-letter requiring manual retry.
2. Every succeeded online payment should map to an accounting payment/GL entry (or DLQ).
3. Operational stock movements for sales must reference `sale_id`; missing reference is a defect.
4. Accounting documents must never be required for local sale success.

## Detectable mismatch classes

| Case | Detection idea | Expected behavior |
| --- | --- | --- |
| MOS sale exists, ERP doc missing | Sale completed + no mapping + no DLQ after SLA | Re-enqueue / manual retry |
| ERP doc exists, MOS event missing | ERP listing without mapping | Investigate orphan; do not auto-delete ERP without human policy |
| Payment amount differs | Compare `payments.amount_minor` vs external doc | Quarantine; manual adjust in ERP or refund flow in MOS |
| Duplicate external document | Same idempotency key → two external ids | Prefer mapping uniqueness; void/cancel duplicate in ERP |
| Inventory vs accounting valuation mismatch | Compare movement ledger totals vs ERP stock value | Expected until valuation lives in ERP; reconcile valuation in ERP tools |

## Manual ops

- Retry from `outbox_dead_letters` (existing ADR-109 path).
- Re-drive accounting consumer for a known `event_id` only if not in `processed_events` (or after controlled processed-row deletion by ops runbook — not automated).

## Non-sources

- Merchant dashboard Mongo aggregates
- Cache keys
- UI displayed totals alone
