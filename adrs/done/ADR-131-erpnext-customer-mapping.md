# ADR-131 - ERPNext Customer Mapping

| Field | Value |
| --- | --- |
| ID | ADR-131 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract.

## Title

ERPNext Customer Mapping - CRM Truth vs Financial Party Truth

## Context

MOS CRM is store-scoped membership centered on Iranian mobile identity. ERPNext Customer is a Party for AR, credit limits, and invoices. ERPNext CRM (Lead/Opportunity) is being deprecated upstream toward Frappe CRM.

## Problem Statement

Conflating CRM profile with financial Customer creates duplicate identities and wrong SoT for loyalty vs balances.

## Goals

Define mapping MOS customer/membership to ERP Customer/Party and clarify dual truths.

## Non Goals

Lead/Opportunity sync; ERP Loyalty Program; live balance UI.

## Decision

### Mapping

| MerchantOS | ERPNext |
| --- | --- |
| Customer identity / membership id | Mapping `entity_type=customer` -> Customer `name` |
| Phone (national Iranian mobile) | Custom field / mobile; used for dedupe hints only |
| Display name | Customer Name |
| Store context | Territory / Cost Center metadata optional - not separate Customers per store by default |
| Billing address (future) | Address linked to Customer |

### Dual truth

| Concern | Truth |
| --- | --- |
| Engagement, membership, loyalty, segments | **MerchantOS CRM** |
| Outstanding balance, credit limit, AR ledger | **ERPNext Customer / Payment Ledger** |

### Rules

1. One ERP Customer per MOS customer identity per merchant (Company), not per store membership row - unless a future ADR proves multi-party need.
2. Never use ERPNext CRM Lead/Opportunity as MOS retention pipeline.
3. Balances flow **E -> M** via future read ACL only; cashiers may see a cached badge later, never invent balances.
4. PII minimization in sync payloads and logs.

### Sync triggers

`CustomerCreated` (+ future profile updates) -> `syncCustomer`.

## Rationale

Preserves store-first membership while enabling invoices against a stable Party.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| ERP Customer as CRM SoT | Breaks StoreMembership / loyalty |
| Customer per store in ERP | Explodes AR; hard consolidation |

## Consequences

Deduping by phone in ERP must be carefully designed at adapter time (unique mobile custom field).

## Implementation Requirements

- [x] Document in `erpnext-crm.md` + this ADR
- [ ] Adapter (deferred)

## Dependencies

ADR-007, ADR-126, ADR-128, ADR-129

## Related Documents

`docs/integrations/erpnext/erpnext-crm.md`

## Migration Plan

None now.

## Testing Requirements

Fake syncCustomer idempotency (existing).

## Iranian User Experience Requirements

Phone remains Iranian mobile format in MOS; ERP storage must accept Unicode names.

## Completion Criteria

- [x] CRM vs financial truth documented
