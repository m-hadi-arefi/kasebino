# ADR-132 - ERPNext Inventory Strategy

| Field | Value |
| --- | --- |
| ID | ADR-132 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext architecture research |
| Folder | `adrs/done/` - architecture contract (docs) landed 2026-08-09 |

## Status

`Accepted` - Architecture contract.

## Title

ERPNext Inventory Strategy - Operational SoT vs Valuation SoT

## Context

MOS tracks `stock_items` + append-only `stock_movements` for availability. ERPNext Stock Ledger tracks qty and valuation with perpetual inventory GL impact.

## Problem Statement

Single-system inventory ownership either kills offline/ERP-down selling or leaves books wrong.

## Goals

Decide who is SoT for quantity vs valuation; define warehouse mapping and movement sync.

## Non Goals

Building MOS purchase receipts; enabling ERP perpetual settings from MOS UI.

## Decision

1. **Operational availability SoT = MerchantOS** for POS/storefront decisions.
2. **Inventory valuation / COGS SoT = ERPNext** after sync.
3. **Warehouse mapping:** Store -> Warehouse via `external_entity_mappings` (`store_warehouse`); Merchant -> Company.
4. **Movement sync M -> E:** sale lines (preferred via Sales Invoice Update Stock) and `StockAdjusted` / movement ids; never Mongo aggregates.
5. **Negative stock / reject policies** remain MOS (ADR-049) for retail; ERP stock validation errors are integration failures -> retry/DLQ, not cashier blockers.
6. **E -> M stock** only later from Purchase Receipt (or equivalent) through ACL - not for this ADR.
7. Prefer **not** dual-writing Stock Entry + Sales Invoice Update Stock for the same sale (avoid double issue).

### Default projection for retail sale

`SaleCompleted` -> Sales Invoice with **Update Stock** against mapped Warehouse.

## Rationale

Retail critical path needs local qty; financial correctness needs ERP valuation engine (FIFO/MA).

## Alternatives Considered

| Alternative | Rejected because |
| --- | --- |
| ERP qty as sole SoT | Breaks offline POS |
| MOS valuation engine | Out of PRD/accounting scope |
| Ignore ERP stock entirely | Leaves Balance Sheet wrong |

## Consequences

Reconciliation must expect temporary valuation divergence until sync catches up.

## Implementation Requirements

- [x] Document in `erpnext-inventory.md` + ownership docs
- [ ] Adapter stock posting (deferred)

## Dependencies

ADR-008, ADR-049, ADR-126, ADR-128, ADR-129

## Related Documents

`docs/integrations/erpnext/erpnext-inventory.md`, `store-mapping.md`

## Migration Plan

Movements already local (ADR-126); ERP projection later.

## Testing Requirements

Movement ledger tests remain MOS-local.

## Iranian User Experience Requirements

N/A directly; weight UOM foundation remains for Iranian bulk goods later.

## Completion Criteria

- [x] Split SoT decision recorded
