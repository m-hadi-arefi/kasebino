# Integration Boundary

## Port

```ts
AccountingProvider {
  providerId
  syncProduct(...)
  syncCustomer(...)
  recordSale(...)
  recordPayment(...)
  recordInventoryAdjustment(...)
  recordPurchase(...) // Unsupported until purchase domain
  recordReturn(...)   // Unsupported until return domain
}
```

Location: `src/modules/accounting/application/ports/accounting-provider.ts`.

Adapters:

- `NoopAccountingProvider` — default production until ERPNext ADR
- `FakeAccountingProvider` — tests (idempotent by `eventId`)
- Future `ERPNextAccountingProvider` — **only** under `infrastructure/providers/erpnext/`

Core use cases and domain aggregates **never** import ERPNext.

## Mapping table

`external_entity_mappings`:

- `merchant_id`, optional `store_id`
- `entity_type`, `entity_id`
- `provider`, `external_id`, optional `external_secondary_id`
- Unique `(merchant_id, provider, entity_type, entity_id)`
- Unique `(merchant_id, provider, entity_type, external_id)`

## Failure model

```text
POS / Storefront succeeds locally
  → outbox row committed
  → worker retries with backoff policy (existing outbox)
  → DLQ after max attempts
  → manual retry
```

ERPNext outage must not fail CompleteSale or checkout.

## Security

- `MOS_ACCOUNTING_PROVIDER=noop|fake` (server env)
- Future credentials: worker/server only; never Next.js public env; never POS client
- Logs: no secrets, no payment credentials, minimize customer PII

## How to add ERPNext later

1. Implement `ERPNextAccountingProvider` against REST/Frappe API behind the port.
2. Map MOS DTOs → Doctypes inside the ACL folder only.
3. Set `MOS_ACCOUNTING_PROVIDER=erpnext` + server secrets.
4. Keep event contracts and mapping table unchanged.
