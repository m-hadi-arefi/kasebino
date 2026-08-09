# ADR-136 - ERPNext Integration Boundary

| Field | Value |
| --- | --- |
| ID | ADR-136 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext goal re-evaluation |
| Folder | `adrs/tasks/` |
| Consolidates | ADR-126 (tech seams) + ADR-127 (boundary prose) |

## Status

`Accepted` — Binding integration boundary.

## Title

ERPNext Integration Boundary — Port, ACL, Outbox Only

## Context

MerchantOS has an `AccountingProvider` port, `external_entity_mappings`, and an `accounting_integration` outbox consumer. Core domains must never grow ERPNext types.

## Decision

### Allowed

| Location | Allowed |
| --- | --- |
| `src/modules/accounting/application/ports/` | Vendor-neutral DTOs |
| `src/modules/accounting/infrastructure/providers/erpnext/` | Frappe REST client, DocType projectors |
| Outbox worker | Call provider after OLTP commit |
| Env (server/worker) | `MOS_ACCOUNTING_PROVIDER`, `MOS_ERPNEXT_*` |

### Forbidden

| Location | Forbidden |
| --- | --- |
| `pos`, `catalog`, `crm`, `loyalty`, `ordering`, `inventory` domain/application | Import ERPNext/Frappe, DocType names, REST URLs |
| CompleteSale / markPaid / catalog write TX | HTTP to ERPNext |
| Browser, POS PWA, storefront | Any ERPNext credentials or proxy that exposes API secret |
| Merchant dashboards | Embedding ERPNext Desk iframe as primary UI |

### Anti-corruption layer

```
Domain event (MOS shape)
  → AccountingOutboxHandler (event switch)
  → AccountingProvider (neutral DTO)
  → ErpNextAccountingProvider (DocType JSON + REST)
```

Mappers in `application/mappers` stay provider-agnostic. DocType field names exist **only** under `infrastructure/providers/erpnext/`.

### Purchase boundary

Purchase SoT = ERPNext. MerchantOS does not invent Purchase Order aggregates for MVP. `recordPurchase` remains unsupported until E→M Purchase Receipt sync ADR.

## Technical Impact

- `resolveAccountingProviderId`: `noop` \| `fake` \| `erpnext`
- Default remains `noop` so CI/dev without ERPNext stays green
- Docker Compose ERPNext stack is **optional** (`docker-compose.erpnext.yml`)

## Security Impact

- API Key/Secret only in server env / Docker secrets
- Never `NEXT_PUBLIC_*`
- Audit provider calls via integration metrics (no payloads with secrets)

## Iranian User Experience Requirements

- Boundary itself is invisible to end users.
- Failures surface as Persian ops alerts later; never block POS cash drawer on ERP downtime (at-least-once outbox).

## Completion Criteria

- [x] Port + forbidden zones documented
- [ ] `erpnext` provider selectable and gated by config validation
- [ ] No DocType imports outside erpnext provider package (lint/test)

## Related ADRs

- ADR-029, ADR-035, ADR-126, ADR-135, ADR-138, ADR-140
