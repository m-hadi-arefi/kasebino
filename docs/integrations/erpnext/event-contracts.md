# Accounting Event Contracts

All events use the existing outbox envelope (ADR-036/037). Past-tense PascalCase English names. `payloadVersion` required.

## Flow

```text
Local OLTP mutation + outbox row (same TX)
        → worker poll
        → accounting_integration consumer
        → AccountingProvider
        → external_entity_mappings update
        → processed_events mark
```

## Consumed events (this phase)

| eventType | Aggregate | AccountingProvider method | Idempotency key preference |
| --- | --- | --- | --- |
| `SaleCompleted` | Sale | `recordSale` | `payload.saleId` or `payload.idempotencyKey` |
| `OrderPaid` | Order | `recordSale` (channel=online) or dedicated later | `payload.orderId` |
| `PaymentSucceeded` | Payment | `recordPayment` | `payload.paymentId` / `providerRef` |
| `ProductCreated` | Product | `syncProduct` | `payload.productId` |
| `ProductUpdated` | Product | `syncProduct` | `payload.productId` + version/time |
| `CustomerCreated` | Customer | `syncCustomer` | `payload.customerId` |
| `StockAdjusted` | StockItem | `recordInventoryAdjustment` | `movement.id` when available / eventId |

## Envelope fields (minimum)

Use existing outbox columns / envelope:

- `eventId`, `eventType`, `merchantId`, `storeId`, `aggregateType`, `aggregateId`
- `occurredAt`, `payloadVersion`, `payload`
- Prefer stable business ids inside payload; do not treat fresh outbox `eventId` alone as the only ERP document key — also use sale/payment ids for mapping.

## Catalog stubs (not implemented in domain yet)

| eventType | Status |
| --- | --- |
| `SaleReturned` | Catalog/unimplemented — no return UC this phase |
| `PurchaseCompleted` | Catalog/unimplemented — ERPNext-first purchasing |

## Forbidden

- Emitting ERPNext Doctype names as `eventType`
- Putting secrets or full payment credentials in payloads
- Using Mongo analytics events as accounting inputs

## Observability metric names

- `integration.event.created`
- `integration.event.processing`
- `integration.event.success`
- `integration.event.retry`
- `integration.event.failed`
- `integration.event.dead_letter`

Labels/fields: `tenant_id`/`merchant_id`, `store_id`, `event_id`, `entity_id`, `event_type`, `provider`, `attempt`.
