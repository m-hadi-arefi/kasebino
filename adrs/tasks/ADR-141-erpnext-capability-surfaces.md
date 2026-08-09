# ADR-141 - ERPNext Capability Surfaces (Phases 1–4)

| Field | Value |
| --- | --- |
| ID | ADR-141 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext capability integration (phased) |
| Folder | `adrs/tasks/` |
| Depends on | ADR-135…140, ADR-034, ADR-021 |

## Status

`Accepted` — Merchant-facing ERPNext capability foundation + core financial flow + finance dashboard + customer financial overview.

## Decision

### Module

Add `src/modules/erpnext/` as the **merchant-facing ERPNext integration ACL**:

- Server-only FinanceReader + sync record lifecycle
- HTTP APIs under `/api/v1/erpnext/*`
- Native MerchantOS UI (no Desk iframe)
- Reuses Frappe HTTP client from `accounting/infrastructure/providers/erpnext` (no second REST stack)

Outbound write sync remains: Outbox → `AccountingProvider` / `ErpNextAccountingProvider`.

### Permissions (extend ADR-034)

| Permission | Owner | store_manager | store_employee (cashier) |
| --- | --- | --- | --- |
| `finance.view` | yes | yes | no |
| `finance.manage` | yes | yes | no |
| `purchase.view` / `purchase.manage` / `supplier.view` | reserved | reserved | no |

Introduce canonical role `store_manager`. Alias `manager` → `store_manager`; `cashier` stays `store_employee`.

### Sync records

Table `erpnext_sync_records` tracks lifecycle: `pending` \| `synced` \| `failed` with Persian `error_message_fa`.  
`external_entity_mappings` remains the ID map SoT.

### Phases in this ADR

1. Foundation (client, errors, permissions, sync records)
2. Sale → Sales Invoice → Payment Entry status in MOS
3. `/finance` dashboard (native)
4. Customer financial overview (separate from loyalty/CRM)

Deferred: suppliers, purchases, inventory valuation, advanced reports (later ADRs).

### Non-goals

- ERPNext Desk embedding
- Browser credentials
- Blocking POS on ERP downtime

## Iranian User Experience Requirements

- Persian RTL finance UI; تومان + Jalali
- Errors normalized to `messageFa`
- Cashiers never see `/finance`

## Completion Criteria

- [x] ADR accepted
- [ ] Module + APIs + UI for phases 1–4
- [ ] Tests (fake reader + sync + RBAC)
- [ ] Docs updated

## Related ADRs

ADR-034, ADR-126, ADR-135…140
