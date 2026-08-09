# ERPNext Integration

MerchantOS is the Iranian-native **retail experience platform**. ERPNext is the external **ERP / accounting financial brain**.

**Never** move MerchantOS UX (POS, storefront, CRM) into ERPNext Desk/Website.  
**Never** put DocTypes inside retail core domains. Connect via Outbox → `AccountingProvider`.

Canonical decisions: **ADR-135…140** (`adrs/tasks/`). Prep seams: ADR-126…134 (`adrs/done/`).  
Connection map: [connection-points.md](./connection-points.md).  
Local Docker: [`scripts/erpnext/README.md`](../../../scripts/erpnext/README.md) (`npm run erpnext:up`).

Runtime code: `src/modules/accounting/infrastructure/providers/erpnext/`.

## Knowledge base (ERPNext itself)

| Doc | Purpose |
| --- | --- |
| [erpnext-overview.md](./erpnext-overview.md) | Architecture, DocTypes, modules |
| [erpnext-accounting.md](./erpnext-accounting.md) | Financial truth engine |
| [erpnext-inventory.md](./erpnext-inventory.md) | Stock ledger & valuation |
| [erpnext-selling.md](./erpnext-selling.md) | Order-to-cash / invoices |
| [erpnext-buying.md](./erpnext-buying.md) | Procurement (ERP-first) |
| [erpnext-crm.md](./erpnext-crm.md) | Why MOS owns retail CRM |
| [erpnext-website-cms.md](./erpnext-website-cms.md) | Why Desk Website is not storefront |
| [erpnext-integration-model.md](./erpnext-integration-model.md) | REST, auth, idempotency patterns |
| [erpnext-data-model.md](./erpnext-data-model.md) | DocType relationships |
| [erpnext-security.md](./erpnext-security.md) | Credential & tenancy rules |

## MerchantOS boundary docs

| Doc | Purpose |
| --- | --- |
| [connection-points.md](./connection-points.md) | Event → DocType map (implementer SoT) |
| [capability-surfaces.md](./capability-surfaces.md) | Merchant finance UX phases (ADR-141) |
| [domain-boundary-analysis.md](./domain-boundary-analysis.md) | Decision table + codebase analysis |
| [domain-ownership.md](./domain-ownership.md) | Detailed SoT matrix |
| [ui-strategy.md](./ui-strategy.md) | Which UI belongs where |
| [store-mapping.md](./store-mapping.md) | Merchant/Store ↔ Company/Warehouse |
| [event-contracts.md](./event-contracts.md) | Outbox → AccountingProvider |
| [integration-boundary.md](./integration-boundary.md) | Port, mapping table, failure model |
| [reconciliation.md](./reconciliation.md) | Future mismatch detection |
| [implementation-plan.md](./implementation-plan.md) | ADR-126 prep plan (historical) |
| [roadmap.md](./roadmap.md) | Phased future delivery |
| [implementation-execution-plan.md](./implementation-execution-plan.md) | Gap-fill execution plan (this implementation pass) |
| [readiness-report.md](./readiness-report.md) | Full audit score + remaining gaps |

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
 Noop/Fake   Future ERPNextAccountingProvider (ACL only)
```

## Rules (permanent)

1. Core domain never imports ERPNext types or SDKs.
2. External sync happens **after** local commit via outbox.
3. Analytics / Mongo warehouses are **not** accounting truth.
4. ERPNext outage must not break POS, storefront, or local inventory.
5. Credentials (future) live only on server/worker — never browser/POS/customer app.
6. MerchantOS UI is retail; ERPNext Desk is accounting — do not replace one with the other.
7. ERPNext is financial truth; MerchantOS is retail experience truth.

## Binding ADRs

- ADR-126 — prep boundaries (done)
- ADR-127 — integration boundary (extends 126)
- ADR-128 — domain ownership
- ADR-129 — synchronization
- ADR-130 — product mapping
- ADR-131 — customer mapping
- ADR-132 — inventory strategy
- ADR-133 — accounting strategy
- ADR-134 — UI strategy
