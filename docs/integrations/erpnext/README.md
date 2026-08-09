# ERPNext Integration (Preparation)

MerchantOS is the Iranian-native **retail platform**. ERPNext will eventually be the external **accounting / ERP engine**.

This folder documents boundaries only. **No ERPNext instance, API client, or credentials are shipped in this phase.**

## Documents

| Doc | Purpose |
| --- | --- |
| [implementation-plan.md](./implementation-plan.md) | Inspection findings + phased delivery plan |
| [domain-ownership.md](./domain-ownership.md) | Source of truth + sync direction |
| [store-mapping.md](./store-mapping.md) | Merchant/Store ↔ Company/Warehouse intent |
| [event-contracts.md](./event-contracts.md) | Outbox events consumed by accounting |
| [reconciliation.md](./reconciliation.md) | Future mismatch detection invariants |
| [integration-boundary.md](./integration-boundary.md) | Ports, mapping table, failure model |

## Architecture (target)

```text
MerchantOS (POS / Store / CRM)
        │
     Domain OLTP (PostgreSQL)
        │
     Outbox (same TX as aggregate)
        │
     Outbox worker
        │
  AccountingProvider (port)
        │
   ┌────┴────┐
 Noop/Fake   Future ERPNextAccountingProvider
```

## Rules

1. Core domain never imports ERPNext types or SDKs.
2. External sync happens **after** local commit via outbox.
3. Analytics / Mongo warehouses are **not** accounting truth.
4. ERPNext outage must not break POS, storefront, or local inventory.
5. Credentials (future) live only on server/worker.
