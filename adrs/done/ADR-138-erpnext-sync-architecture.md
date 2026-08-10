# ADR-138 - ERPNext Sync Architecture

| Field | Value |
| --- | --- |
| ID | ADR-138 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext goal re-evaluation |
| Folder | `adrs/tasks/` |
| Rewrites | ADR-129 (outline → implementable contracts) |

## Status

`Accepted` — Sync spine contract for runtime adapter.

## Title

ERPNext Sync Architecture — Outbox, Idempotency, Retry, Reconciliation

## Decision

### Pipeline

```
OLTP TX (PG)
  domain write + outbox insert (same TX for CompleteSale)
COMMIT
  → outbox worker
  → consumer accounting_integration
  → AccountingProvider (erpnext)
  → Frappe REST /api/resource/:DocType
  → upsert external_entity_mappings
```

Never call ERPNext inside the retail unit of work.

### Delivery semantics

| Concern | Rule |
| --- | --- |
| Delivery | At-least-once via outbox |
| Consumer dedupe | `processed_events` per consumer name |
| Provider dedupe | Lookup mapping by entity; also search DocType by `mos_event:{eventId}` marker |
| Retry | Outbox attempt backoff; permanent DocType validation → DLQ |
| Ordering | Prefer product/customer before sale; handler may `syncCustomer` inline before `recordSale` |

### Event → provider method

| Event | Provider |
| --- | --- |
| ProductCreated / ProductUpdated | `syncProduct` |
| ProductDeleted | `syncProduct` with disabled / dedicated disable path |
| MembershipCreated / MembershipUpdated | `syncCustomer` |
| SaleCompleted | `syncCustomer?` + `recordSale` |
| OrderPaid | `recordSale` channel=online with **lines** |
| PaymentSucceeded | `recordPayment` |
| StockAdjusted | `recordInventoryAdjustment` |

Ignored on purpose: loyalty points, realtime MQTT mirrors, analytics beacons.

### Failure taxonomy

| Class | Behavior |
| --- | --- |
| Network / 5xx | Retry |
| 401/403 | Fail loud; do not spin forever without alert |
| 417 / LinkValidation / mandatory missing | DLQ + ops |
| Duplicate | Treat as success (`alreadyApplied`) |

### Reconciliation

- Periodic job (future): count MOS SaleCompleted vs mapped Sales Invoices per merchant/day
- Drift produces ops metric, not silent rewrite of GL

### E → M (later)

Inbound ACL only: webhooks or poller in integration package. Never ERP cron writing PG retail tables directly.

## Iranian User Experience Requirements

- Sync lag must not freeze POS; cashier success is MOS commit.
- Accountant Desk may show invoices seconds–minutes later (acceptable).

## Completion Criteria

- [x] Pipeline + event matrix accepted
- [ ] Worker resolves `erpnext` provider
- [ ] Provider idempotent under duplicate outbox delivery (tests with mocked HTTP)
- [ ] Reconciliation worker (deferred acceptable with metric stubs)

## Related ADRs

- ADR-035, ADR-036, ADR-126, ADR-136, ADR-140
