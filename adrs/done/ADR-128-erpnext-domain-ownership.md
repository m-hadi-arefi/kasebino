# ADR-128 - ERPNext Domain Ownership

| Field | Value |
| --- | --- |
| ID | ADR-128 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract. Detail matrix: `docs/integrations/erpnext/domain-ownership.md`.

## Title

ERPNext Domain Ownership - Retail vs Financial Sources of Truth

## Context

Overlapping vocabularies (Customer, Item/Product, Invoice/Sale, Stock) invite duplicate SoTs.

## Problem Statement

Without explicit ownership, implementers will build GL in MOS or push CRM into ERPNext.

## Goals

Define ownership for MerchantOS, ERPNext, and shared domains with sync direction.

## Non Goals

Live sync; Iran tax rule engine inside MOS.

## Decision

### MerchantOS owns

- POS (incl. offline)
- Customer experience / storefront / store PWA
- CRM membership and loyalty
- Orders / pickup lifecycle
- Catalog presentation and barcode UX
- Operational inventory availability
- Payment capture orchestration (with PSP)
- Notifications, SaaS admin, retention analytics

### ERPNext owns

- Accounting (CoA, GL, journals)
- Purchase / suppliers / AP
- Financial reporting and tax accounting configuration
- Inventory **valuation** / COGS books
- Statutory-style ledgers and period controls

### Shared (projected; MOS identity wins initially)

| Domain | SoT identity | Sync |
| --- | --- | --- |
| Product | MOS | M -> E Item |
| Inventory movements | MOS operational; E valuation | M -> E |
| Payment | PSP+MOS intent; E payment entry | M -> E |
| Customer | MOS CRM; E party/AR | M -> E; balances E -> M later |
| Store | MOS; E Warehouse/Cost Center | M -> E |

### Explicit exclusions

- ERPNext CRM module / Frappe CRM is **not** MOS CRM.
- ERPNext Website is **not** MOS storefront.
- Blog/CMS via ERP = rejected default (see UI + website docs).

## Rationale

Matches PRD ("not accounting software") while enabling real books later without rewriting retail domains.

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| ERP owns product catalog | Breaks storefront/POS UX iteration |
| MOS builds purchase MVP now | Dual SoT before reconciliation |
| Dual CRM | Conflicting phones/membership |

## Consequences

Agents must check ownership matrix before new entities. Purchase UX requires a new ADR before MOS SoT claims.

## Technical Impact

Mapping `entity_type` taxonomy documented; no schema change required beyond ADR-126.

## Domain / Analytics / Security Impact

As ADR-126; analytics is not finance; credentials server-only.

## Implementation Requirements

- [x] `domain-ownership.md` + `domain-boundary-analysis.md`
- [x] Cross-link from AGENT/PRD

## Dependencies

ADR-126, ADR-127, ADR-003, ADR-015

## Related Documents

`docs/integrations/erpnext/domain-ownership.md`

## Migration Plan

None.

## Testing Requirements

Ownership documented; contract tests continue using Fake provider.

## Iranian User Experience Requirements

N/A for this ADR; ownership preserves Persian retail UX in MOS.

## Completion Criteria

- [x] Decision table published and justified
- [x] No ownership contradiction with ADR-126
