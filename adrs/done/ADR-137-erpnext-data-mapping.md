# ADR-137 - ERPNext Data Mapping

| Field | Value |
| --- | --- |
| ID | ADR-137 |
| Status | `Accepted` |
| Date | 2026-08-09 |
| Origin | ERPNext goal re-evaluation |
| Folder | `adrs/tasks/` |
| Consolidates | ADR-130 + ADR-131 + Sale/Payment/Inventory/Purchase mapping |

## Status

`Accepted` — Binding entity SoT + DocType projection map.

## Title

ERPNext Data Mapping — Product, Customer, Sale, Payment, Inventory, Purchase

## Decision

### Product

| Aspect | Value |
| --- | --- |
| SoT | MerchantOS `Product` (SKU = product identity for MVP) |
| ERP DocType | `Item` (+ `Item Price` on Price List when enabled) |
| Direction | M → E |
| When | `ProductCreated`, `ProductUpdated`; `ProductDeleted` → Item `disabled=1` |
| Keys | MOS `productId` ↔ mapping; ERP `item_code` = MOS `sku`; barcode → `barcode` child |
| UOM | MOS `unitCode` (`piece`/`kg`/`g`) → ERP `stock_uom` (must exist) |

### Customer

| Aspect | Value |
| --- | --- |
| Engagement SoT | MerchantOS `StoreMembership` + platform `customerId` |
| ERP DocType | `Customer` (Party for A/R) |
| Direction | M → E identity/phone; E → M balances **later** |
| When | `MembershipCreated`, `MembershipUpdated`, and customer stub on `SaleCompleted` |
| Keys | MOS `customerId` ↔ mapping; ERP customer name `MOS-{customerId}` |
| Non-goal | ERPNext CRM / Lead Funnel is not MOS CRM |

### Sale

| Aspect | Value |
| --- | --- |
| SoT | MOS `Sale` (POS) / `Order` (online pickup) |
| ERP DocType | `Sales Invoice` |
| Direction | M → E |
| When | `SaleCompleted` (POS); `OrderPaid` (online) |
| Stock on invoice | POS: `update_stock=1` (counter sale); Online: `update_stock=0` until pickup stock path is ERP-aligned |
| Idempotency | `external_entity_mappings` + invoice `po_no` / remarks `mos_event:{eventId}` |
| Lines | Required; empty lines forbidden for new emissions |

### Payment

| Aspect | Value |
| --- | --- |
| SoT | MOS tender (POS) / `PaymentIntent` (online PSP) |
| ERP DocType | `Payment Entry` (online); POS may settle via Sales Invoice payments child when tender present |
| Direction | M → E |
| When | `PaymentSucceeded`; POS tender embedded on `SaleCompleted` |

### Inventory

| Aspect | Value |
| --- | --- |
| Operational qty SoT | MerchantOS `StockItem` + `StockMovement` |
| Valuation / COGS SoT | ERPNext Stock Ledger / accounts |
| Direction | M → E for **adjustments**; sales stock via Sales Invoice Update Stock (avoid double issue) |
| When | `StockAdjusted` → `Stock Entry`; **do not** also post Stock Entry for POS sale deltas already on invoice |
| Purchase restock | E → M later from Purchase Receipt |

### Purchase

| Aspect | Value |
| --- | --- |
| SoT | ERPNext only (MVP) |
| Why | MOS has no full purchasing domain; accountants use Desk for suppliers/PO/PR |
| MOS | No purchase aggregate; `recordPurchase` unsupported |
| Future | ACL: Purchase Receipt submitted → MOS stock movement `purchase` |

### Store

| Aspect | Value |
| --- | --- |
| SoT | MerchantOS `Store` |
| ERP | `Warehouse` (+ optional Cost Center) |
| Direction | M → E (bootstrap / naming `MOS-{storeId}`) |
| Config | Local Docker may use single `MOS_ERPNEXT_WAREHOUSE` until per-store sync exists |

## Mapping table

Persist in `external_entity_mappings`: `(merchantId, provider=erpnext, entityType, entityId) ↔ externalId`.

Entity types: `product`, `customer`, `sale`, `order`, `payment`, `stock_adjustment`, `store_warehouse`.

## Iranian User Experience Requirements

- Product **names** sync as Persian UTF-8 to Item `item_name`.
- Customer phones remain Iranian national format in MOS; ERP may store as mobile.
- Money stays IRR integer minors in MOS; ERP rates use company currency IRR.

## Completion Criteria

- [x] Consolidated mapping decision
- [ ] Adapter implements Item/Customer/Sales Invoice/Payment Entry/Stock Entry projectors
- [ ] OrderPaid includes line payloads

## Related ADRs

- ADR-008, ADR-009, ADR-011, ADR-012, ADR-132, ADR-138, ADR-140
